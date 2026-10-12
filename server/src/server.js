/** Entry point: validates config (on import), checks the database, starts HTTP + the processing worker. */
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { REQUIRED_MIGRATIONS } from './config/constants.js';
import { logger } from './utils/logger.js';
import { createApp } from './app.js';
import { startWorker, stopWorker } from './jobs/worker.js';

async function main() {
  // fail fast if the database or migrations are not reachable
  try {
    const r = await pool.query(`select count(*)::int as n from public.ai_knowledge_chat_schema_migrations`);
    if (r.rows[0].n < REQUIRED_MIGRATIONS) throw new Error('Database migrations are incomplete. Run: npm run db:migrate');
  } catch (e) {
    logger.fatal({ code: e.code }, `Database check failed: ${e.code === '42P01' ? 'migrations have not been applied (npm run db:migrate)' : e.message}`);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => logger.info({ port: env.PORT, prefix: env.API_PREFIX, origins: env.corsOrigins }, `NEXUS AI API listening on http://localhost:${env.PORT}${env.API_PREFIX}`));
  server.requestTimeout = 120000;
  server.headersTimeout = 65000;
  startWorker();

  let shuttingDown = false;
  const shutdown = async signal => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    server.close();
    await stopWorker();
    await pool.end().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('unhandledRejection', e => logger.error({ err: { message: e?.message } }, 'unhandled rejection'));
}

main();
