/**
 * Authorized hybrid retrieval. Access control happens INSIDE the SQL functions
 * (ai_knowledge_chat_match_chunks / _search_chunks both filter by ai_knowledge_chat_accessible_source_ids),
 * so a private source is never retrieved for a user who cannot see it — it is not merely hidden later.
 */
import { many, toVector } from '../config/database.js';
import { FN } from '../config/constants.js';
import { embedQuery } from './embedding.service.js';
import { fuseResults } from './reranking.service.js';
import { TYPE_GROUP } from './source.service.js';

/**
 * → { evidence: [...], sufficient: boolean, bestSimilarity, stats }
 * opts: { limit, minSimilarity, group: 'all'|'youtube'|'document'|'text'|'conversation' }
 */
export async function retrieve(user, question, { limit = 8, minSimilarity = 0.3, group = 'all' } = {}) {
  const vec = await embedQuery(question, user.id);
  const [vectorHits, keywordHits] = await Promise.all([
    many(`select * from ${FN.matchChunks}($1, $2::extensions.vector, $3, $4)`, [user.id, toVector(vec), 24, 0]),
    many(`select * from ${FN.searchChunks}($1, $2, $3)`, [user.id, question.slice(0, 500), 12]).catch(() => [])
  ]);
  const inGroup = h => group === 'all' || TYPE_GROUP[h.source_type] === group;
  const relevantVector = vectorHits.filter(h => inGroup(h) && h.similarity >= minSimilarity);
  // keyword hits only count when they are not semantically unrelated (avoids matching on stop-word noise)
  const simById = new Map(vectorHits.map(h => [h.chunk_id, h.similarity]));
  const relevantKeyword = keywordHits.filter(h => inGroup(h) && (simById.get(h.chunk_id) ?? minSimilarity) >= minSimilarity * 0.75);
  const fused = fuseResults(relevantVector, relevantKeyword, { limit });
  const bestSimilarity = vectorHits.filter(inGroup).reduce((m, h) => Math.max(m, h.similarity), 0);
  return {
    evidence: fused,
    sufficient: fused.length > 0 && bestSimilarity >= minSimilarity,
    bestSimilarity,
    stats: { vector: vectorHits.length, keyword: keywordHits.length, used: fused.length }
  };
}
