/**
 * PostgreSQL pool (Supabase pooler, transaction mode). All queries are parameterized.
 * The server connects as the table owner, which bypasses RLS — every query MUST therefore
 * enforce the caller's identity, role and source visibility explicitly.
 */
import pg from 'pg';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// numeric/bigint as JS numbers where safe for counts
pg.types.setTypeParser(20, v => (v === null ? null : Number(v)));

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  application_name: 'nexus-ai-server'
});
pool.on('error', err => logger.error({ err: { code: err.code, message: err.message } }, 'database pool error'));
// pg only listens for errors on IDLE clients; a socket error on a checked-out client would otherwise be an
// unhandled 'error' event and crash the process. The failing query still rejects normally.
pool.on('connect', client => client.on('error', err => logger.warn({ err: { code: err.code, message: err.message } }, 'database connection error')));

/** Run a parameterized query. */
export const query = (text, params = []) => pool.query(text, params);

/** First row or null. */
export const one = async (text, params = []) => (await pool.query(text, params)).rows[0] || null;

/** All rows. */
export const many = async (text, params = []) => (await pool.query(text, params)).rows;

/** Run `fn(client)` inside a transaction; rolls back on any error. */
export async function tx(fn) {
  const client = await pool.connect();
  let broken = null;
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (e) {
    // errors without a Postgres severity are connection-level: don't return that connection to the pool
    if (!e.severity) broken = e;
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release(broken || undefined);
  }
}

/** pgvector literal for an embedding array. pgvector stores float4, so 7 significant digits lose nothing (and keep payloads ~40% smaller). */
export const toVector = arr => `[${arr.map(n => (Number.isFinite(n) ? +n.toPrecision(7) : 0)).join(',')}]`;
