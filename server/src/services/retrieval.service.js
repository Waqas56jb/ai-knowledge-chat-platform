/**
 * Authorized hybrid retrieval. Access control happens INSIDE the SQL functions
 * (ai_knowledge_chat_match_chunks / _search_chunks both filter by ai_knowledge_chat_accessible_source_ids),
 * so a private source is never retrieved for a user who cannot see it — it is not merely hidden later.
 *
 * Pipeline: vector + keyword search for the question (and, with AI assist, for up to 3 expert-phrased rewrites)
 * → reciprocal-rank fusion → (AI assist) relevance rerank of the candidates → top passages as evidence.
 */
import { many, query, toVector } from '../config/database.js';
import { FN, T } from '../config/constants.js';
import { env } from '../config/env.js';
import { AI } from '../config/openai.js';
import { embedQuery } from './embedding.service.js';
import { embed } from './openai.service.js';
import { fuseLists } from './reranking.service.js';
import { expandQuery, rerank } from './retrievalAssist.service.js';
import { TYPE_GROUP } from './source.service.js';
import { logger } from '../utils/logger.js';

const CANDIDATES = 24;          // per search query and list
const RERANK_CANDIDATES = 16;  // fused candidates the AI scores

/**
 * Keep the distinctive words of a query for keyword search. In a library that is all about one topic, words
 * like "test", "strips" or "sell" appear everywhere and drown out the word that matters ("pharmacies"), so words
 * found in more than 12% of passages are dropped (the 2 rarest words are always kept). Falls back to the text.
 */
const COMMON_SHARE = 0.12;
let totalChunks = { n: 0, at: 0 };
export async function distinctiveTerms(text) {
  const words = [...new Set(String(text).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]{1,40}/gu) || [])].slice(0, 30);
  if (!words.length) return text;
  try {
    if (Date.now() - totalChunks.at > 5 * 60000) totalChunks = { n: Number((await many(`select count(*)::int as n from ${T.chunks}`))[0].n) || 1, at: Date.now() };
    const df = await many(`select w, (select count(*)::int from ${T.chunks} c where c.fts @@ plainto_tsquery('english', w)) as n
                           from unnest($1::text[]) w where plainto_tsquery('english', w)::text <> ''`, [words]);
    const present = df.filter(r => r.n > 0).sort((a, b) => a.n - b.n);
    if (!present.length) return text;
    const keep = present.filter((r, i) => i < 2 || r.n / totalChunks.n <= COMMON_SHARE).map(r => r.w);
    return keep.join(' ');
  } catch { return text; }
}

/**
 * Sources whose TITLE contains the query's distinctive words (a video called "... Connect with Pharmacies ..." for
 * "how do I find pharmacies ...") contribute their passage closest to the question. Titles name a video's topic,
 * which generic passages about the same business otherwise outrank. Access is enforced like the other searches.
 */
async function titleHits(user, terms, vec) {
  if (!terms || !terms.trim()) return [];
  // only words that are rare among TITLES identify a topic ("pharmacies"), not ones most titles share ("strips")
  let rare;
  try {
    const df = await many(`select w, (select count(*)::int from ${T.sources} s where s.status = 'indexed' and to_tsvector('english', s.title) @@ plainto_tsquery('english', w)) as n,
                                  (select count(*)::int from ${T.sources} where status = 'indexed') as total
                             from unnest($1::text[]) w where plainto_tsquery('english', w)::text <> ''`, [terms.split(/\s+/).filter(Boolean)]);
    rare = df.filter(r => r.n > 0 && r.n <= Math.max(2, r.total * 0.05)).map(r => r.w);
  } catch { return []; }
  if (!rare.length) return [];
  terms = rare.join(' ');
  return many(`
    with q as (select nullif(replace(websearch_to_tsquery('english', $2)::text, ' & ', ' | '), '')::tsquery as tsq),
    src as (
      select s.id, s.title, s.source_type, s.source_url, s.metadata,
             ts_rank(to_tsvector('english', s.title), q.tsq, 1) as trank
        from ${T.sources} s cross join q
       where q.tsq is not null and s.status = 'indexed'
         and to_tsvector('english', s.title) @@ q.tsq
         and s.id in (select ${FN.accessibleSources}($1))
       order by trank desc limit 6
    )
    select c.id as chunk_id, c.source_id, c.chunk_index, c.content, c.start_seconds, c.end_seconds, c.page_number,
           src.title as source_title, src.source_type, src.source_url, src.metadata,
           1 - (c.embedding <=> $3::extensions.vector) as similarity
      from src cross join lateral (
        select * from ${T.chunks} c where c.source_id = src.id and c.embedding is not null
         order by c.embedding <=> $3::extensions.vector limit 1
      ) c
     order by src.trank desc`, [user.id, terms, toVector(vec)]).catch(e => { logger.warn({ code: e.code, message: e.message }, "title search failed"); return []; });
}

async function searchOne(user, text, vec) {
  const terms = await distinctiveTerms(text.slice(0, 500));
  const [vectorHits, keywordHits, titled] = await Promise.all([
    many(`select * from ${FN.matchChunks}($1, $2::extensions.vector, $3, $4)`, [user.id, toVector(vec), CANDIDATES, 0]),
    many(`select * from ${FN.searchChunks}($1, $2, $3)`, [user.id, terms, 12]).catch(() => []),
    titleHits(user, terms, vec)
  ]);
  return { vectorHits, keywordHits, titleHits: titled };
}

/**
 * → { evidence: [...], sufficient: boolean, bestSimilarity, stats }
 * opts: { limit, minSimilarity, group: 'all'|'youtube'|'document'|'text'|'conversation', assist }
 */
export async function retrieve(user, question, { limit = 8, minSimilarity = 0.3, group = 'all', assist = env.RETRIEVAL_ASSIST } = {}) {
  const inGroup = h => group === 'all' || TYPE_GROUP[h.source_type] === group;

  // the original question is searched while the rewrites are being written
  const [base, expansions] = await Promise.all([
    embedQuery(question, user.id).then(vec => searchOne(user, question, vec)),
    assist ? expandQuery(question) : Promise.resolve([])
  ]);
  const runs = [{ text: question, ...base }];
  if (expansions.length) {
    try {
      const { vectors, tokens } = await embed(expansions);
      query(`insert into ${T.usage} (user_id, kind, model, input_tokens) values ($1, 'embedding_query', $2, $3)`, [user.id || null, AI.embeddingModel, tokens]).catch(() => {});
      runs.push(...await Promise.all(expansions.map((q, i) => searchOne(user, q, vectors[i]).then(r => ({ text: q, ...r })))));
    } catch { /* rewrites are optional */ }
  }

  const allVector = runs.flatMap(r => r.vectorHits).filter(inGroup);
  const bestSimilarity = allVector.reduce((m, h) => Math.max(m, h.similarity), 0);
  const simById = new Map();
  for (const h of allVector) simById.set(h.chunk_id, Math.max(simById.get(h.chunk_id) ?? 0, h.similarity));
  const lists = runs.flatMap(r => [
    { kind: 'vector', hits: r.vectorHits.filter(h => inGroup(h) && h.similarity >= minSimilarity) },
    // keyword hits only count when they are not semantically unrelated (avoids matching on stop-word noise)
    { kind: 'keyword', hits: r.keywordHits.filter(h => inGroup(h) && (simById.get(h.chunk_id) ?? minSimilarity) >= minSimilarity * 0.75) }
  ]);
  const candidates = fuseLists(lists, { limit: assist ? RERANK_CANDIDATES : limit });
  // passages from sources whose title matches the question always reach the reranker (it decides relevance)
  if (assist) {
    const seen = new Set(candidates.map(c => c.chunk_id));
    const titled = runs.flatMap(r => r.titleHits || []).filter(h => inGroup(h) && h.similarity >= minSimilarity * 0.75);
    for (const h of titled) {
      if (candidates.length >= RERANK_CANDIDATES + 4) break;
      if (!seen.has(h.chunk_id)) { seen.add(h.chunk_id); candidates.push({ ...h, score: 0, keywordRank: null }); }
    }
  }

  let evidence = candidates.slice(0, limit);
  let sufficient = evidence.length > 0 && bestSimilarity >= minSimilarity;
  let reranked = false;
  if (assist && candidates.length && bestSimilarity >= minSimilarity) {
    const scores = await rerank(question, candidates);
    if (scores) {
      reranked = true;
      const ordered = candidates.map((c, i) => ({ c, i, s: scores.get(c.chunk_id) ?? 0 }))
        .filter(x => x.s >= 1).sort((a, b) => b.s - a.s || a.i - b.i);
      evidence = ordered.slice(0, limit).map(x => ({ ...x.c, relevance: x.s }));
      // the reranker orders; the answer model + grounding check decide how much can be answered.
      // Only when every candidate is unrelated (0) is the question treated as not covered.
      sufficient = ordered.length > 0;
    }
  }
  return {
    evidence,
    sufficient,
    bestSimilarity,
    stats: {
      vector: runs.reduce((n, r) => n + r.vectorHits.length, 0), keyword: runs.reduce((n, r) => n + r.keywordHits.length, 0),
      queries: runs.length, candidates: candidates.length, reranked, used: evidence.length
    }
  };
}
