/** Query embeddings (index embeddings are created by the ingestion pipeline and reused). */
import { embed } from './openai.service.js';
import { query } from '../config/database.js';
import { T } from '../config/constants.js';
import { AI } from '../config/openai.js';

const cache = new Map(); // normalised question -> vector (small LRU to avoid re-embedding retries)

export async function embedQuery(text, userId) {
  const key = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (cache.has(key)) return cache.get(key);
  const { vectors, tokens } = await embed([key]);
  query(`insert into ${T.usage} (user_id, kind, model, input_tokens) values ($1, 'embedding_query', $2, $3)`, [userId || null, AI.embeddingModel, tokens]).catch(() => {});
  cache.set(key, vectors[0]);
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return vectors[0];
}
