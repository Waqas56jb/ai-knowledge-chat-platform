/**
 * Queue re-indexing (new processing jobs) for indexed sources.
 *   npm run reindex-sources              sources indexed with a different embedding model than configured
 *   npm run reindex-sources -- --all     every indexed source
 *   npm run reindex-sources -- --source <uuid>
 * The running server's worker processes the queued jobs. Existing chunks stay searchable until each
 * job swaps them out in a single transaction.
 */
import { pool, tx } from '../src/config/database.js';
import { AI } from '../src/config/openai.js';
import { enqueueJob, firstJobType } from '../src/services/processing.service.js';

const args = process.argv.slice(2);
const all = args.includes('--all');
const one = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;

try {
  const params = []; let where = `status = 'indexed' and coalesce(metadata ->> 'kind', '') <> 'channel'`;
  if (one) { params.push(one); where += ` and id = $1`; } else if (!all) { params.push(AI.embeddingModel); where += ` and coalesce(metadata ->> 'embeddingModel', '') <> $1`; }
  const rows = (await pool.query(`select id, title, source_type, metadata from public.ai_knowledge_chat_sources where ${where}`, params)).rows;
  let queued = 0, skipped = 0;
  for (const s of rows) {
    try { await tx(db => enqueueJob(db, { sourceId: s.id, jobType: firstJobType(s.source_type, false) })); queued++; }
    catch (e) { skipped++; console.log(`  · skipped "${s.title}": ${e.message}`); }
  }
  console.log(`✓ queued ${queued} source(s) for re-indexing${skipped ? `, ${skipped} skipped` : ''}. Start the server so the worker processes them.`);
} finally {
  await pool.end();
}
