/**
 * Ranking strategy (no reranking MODEL is used): Reciprocal Rank Fusion of the vector and full-text
 * result lists, score = Σ 1 / (k + rank), k = 60. Duplicates (same chunk) are merged; near-identical
 * overlapping text from the same source is collapsed so the context is not wasted on repeats.
 */
export function fuseResults(vectorHits, keywordHits, { k = 60, limit = 8 } = {}) {
  const map = new Map();
  const add = (list, kind) => list.forEach((h, i) => {
    const cur = map.get(h.chunk_id) || { ...h, score: 0, similarity: null, keywordRank: null };
    cur.score += 1 / (k + i + 1);
    if (kind === 'vector') cur.similarity = h.similarity;
    else cur.keywordRank = h.rank;
    map.set(h.chunk_id, cur);
  });
  add(vectorHits, 'vector');
  add(keywordHits, 'keyword');
  const ranked = [...map.values()].sort((a, b) => b.score - a.score);
  const out = [];
  for (const h of ranked) {
    const dup = out.find(o => o.source_id === h.source_id && overlapRatio(o.content, h.content) > 0.8);
    if (!dup) out.push(h);
    if (out.length >= limit) break;
  }
  return out;
}

function overlapRatio(a, b) {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  if (!wa.size || !wb.size) return 0;
  let inter = 0; for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.min(wa.size, wb.size);
}
