/** Entry point: validates config (on import), checks the database, starts HTTP + the processing worker. */
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { REQUIRED_MIGRATIONS } from './config/constants.js';
import { logger } from './utils/logger.js';
import { createApp } from './app.js';
import { startWorker, stopWorker } from './jobs/worker.js';

async function main() {
  // fail fast if migrations are missing; retry briefly if the database is only momentarily unreachable
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await pool.query(`select count(*)::int as n from public.ai_knowledge_chat_schema_migrations`);
      if (r.rows[0].n < REQUIRED_MIGRATIONS) throw Object.assign(new Error('Database migrations are incomplete. Run: npm run db:migrate'), { permanent: true });
      break;
    } catch (e) {
      const permanent = e.permanent || e.code === '42P01' || e.code === '28P01';
      if (permanent || attempt >= 5) {
        logger.fatal({ code: e.code }, `Database check failed: ${e.code === '42P01' ? 'migrations have not been applied (npm run db:migrate)' : e.message}`);
        process.exit(1);
      }
      logger.warn({ code: e.code, attempt }, 'database not reachable yet, retrying');
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => logger.info({ port: env.PORT, prefix: env.API_PREFIX, origins: env.corsOrigins }, `DTS AI API listening on http://localhost:${env.PORT}${env.API_PREFIX}`));
  server.requestTimeout = 120000;
  // keep idle connections open longer than the platform proxy (Railway/Nginx), otherwise the proxy can reuse a
  // socket Node just closed and answer 502; headersTimeout must exceed keepAliveTimeout
  server.keepAliveTimeout = 75000;
  server.headersTimeout = 76000;
  startWorker();

  let shuttingDown = false;
  const shutdown = async signal => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    server.close();
    await stopWorker();
    await pool.end().catch(() => {});
    process.exit(signal === 'uncaughtException' ? 1 : 0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('unhandledRejection', e => logger.error({ err: { message: e?.message } }, 'unhandled rejection'));
  // state may be corrupt after an uncaught exception: log, close cleanly and let the platform restart the process
  process.on('uncaughtException', e => { logger.fatal({ err: { message: e?.message, stack: e?.stack } }, 'uncaught exception'); shutdown('uncaughtException').finally(() => process.exit(1)); });
}

main();
