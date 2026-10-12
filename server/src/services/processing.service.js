/**
 * PostgreSQL-backed job queue.
 *  - Jobs are rows; a worker claims one atomically with FOR UPDATE SKIP LOCKED (no double processing).
 *  - A unique partial index allows at most one queued/processing job per source.
 *  - Stale "processing" jobs (crashed worker) are re-queued or failed after JOB_STALE_MINUTES.
 *  - Transient failures (network, OpenAI 5xx/429, YouTube rate limits) retry with exponential backoff;
 *    permanent failures (no captions, unreadable file) fail immediately.
 *  - Retrying a failed/cancelled job creates a NEW job linked via parent_job_id (history is preserved).
 */
import os from 'node:os';
import { one, many, query } from '../config/database.js';
import { T, JOB_TRANSITIONS } from '../config/constants.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { safeErrorMessage } from '../utils/sanitize.js';
import { logger } from '../utils/logger.js';
import { recordAudit } from './audit.service.js';
import { notifyAdmins } from './notification.service.js';
import { jobOut } from './source.service.js';

export const WORKER_ID = `${os.hostname()}:${process.pid}`;
export const canTransition = (from, to) => (JOB_TRANSITIONS[from] || []).includes(to);

const FIRST_JOB = { youtube: 'transcript_extraction', pdf: 'document_extraction', docx: 'document_extraction', txt: 'text_normalization', markdown: 'text_normalization', business_knowledge: 'text_normalization', client_conversation: 'text_normalization' };
export const firstJobType = (sourceType, isChannel) => (isChannel ? 'channel_discovery' : FIRST_JOB[sourceType]);

/** Insert a queued job (use inside a transaction via `db`). Throws 409 if the source already has an active job. */
export async function enqueueJob(db, { sourceId, jobType, requestedBy = null, parentJobId = null, runAfter = null }) {
  try {
    const r = await db.query(
      `insert into ${T.jobs} (source_id, job_type, requested_by, parent_job_id, run_after, logs)
       values ($1, $2, $3, $4, coalesce($5, now()), jsonb_build_array(jsonb_build_object('at', now(), 'level', 'info', 'message', 'Job queued.')))
       returning *`, [sourceId, jobType, requestedBy, parentJobId, runAfter]);
    await db.query(`update ${T.sources} set status = case when status = 'disabled' then status else 'pending' end, error_message = null where id = $1`, [sourceId]);
    return r.rows[0];
  } catch (e) {
    if (e.code === '23505') throw ApiError.conflict('A processing job is already queued or running for this source.');
    throw e;
  }
}

/** Atomically claim the next runnable job. */
export async function claimNextJob(workerId = WORKER_ID) {
  return one(`update ${T.jobs} j set status = 'processing', locked_by = $1, locked_at = now(), started_at = coalesce(j.started_at, now()),
                attempts = j.attempts + 1, current_step = 'Starting'
              where j.id = (
                select id from ${T.jobs} where status = 'queued' and run_after <= now()
                order by created_at for update skip locked limit 1)
              returning j.*`, [workerId]);
}

/** Re-queue (or fail) jobs left "processing" by a crashed worker. */
export async function recoverStaleJobs() {
  const rows = await many(`update ${T.jobs} set
        status = case when attempts < max_attempts then 'queued' else 'failed' end,
        error_message = case when attempts < max_attempts then error_message else 'Processing was interrupted repeatedly and was stopped.' end,
        completed_at = case when attempts < max_attempts then null else now() end,
        locked_by = null, locked_at = null, run_after = now(),
        logs = logs || jsonb_build_array(jsonb_build_object('at', now(), 'level', 'warn', 'message', 'Recovered after the worker stopped unexpectedly.'))
      where status = 'processing' and locked_at < now() - ($1 || ' minutes')::interval returning id, status, source_id`, [String(env.JOB_STALE_MINUTES)]);
  for (const r of rows) if (r.status === 'failed') await query(`update ${T.sources} set status = 'failed', error_message = 'Processing was interrupted.' where id = $1 and status = 'processing'`, [r.source_id]);
  if (rows.length) logger.warn({ count: rows.length }, 'recovered stale jobs');
  return rows.length;
}

/** Progress reporter bound to one claimed job. Logs are kept bounded (last 200 entries). */
export function jobReporter(job) {
  const logs = Array.isArray(job.logs) ? job.logs.slice(-150) : [];
  return {
    log(level, message) { logs.push({ at: new Date().toISOString(), level, message: String(message).slice(0, 500) }); },
    async progress(progress, step, message) {
      if (message) this.log('info', message);
      await query(`update ${T.jobs} set progress = $2, current_step = $3, logs = $4, locked_at = now() where id = $1 and status = 'processing'`,
        [job.id, Math.max(0, Math.min(100, Math.round(progress))), step, JSON.stringify(logs.slice(-200))]);
    },
    async complete(result = {}) {
      this.log('info', 'Completed.');
      await query(`update ${T.jobs} set status = 'completed', progress = 100, current_step = 'Completed', completed_at = now(), locked_by = null, locked_at = null, logs = $2, result = $3 where id = $1`,
        [job.id, JSON.stringify(logs.slice(-200)), JSON.stringify(result)]);
    },
    async fail(err) {
      const msg = safeErrorMessage(err, 'Processing failed.');
      const transient = !!err?.transient && !err?.permanent;
      const retry = transient && job.attempts < job.max_attempts;
      this.log(retry ? 'warn' : 'error', retry ? `${msg} Retrying (attempt ${job.attempts + 1} of ${job.max_attempts}).` : msg);
      const backoffSec = Math.min(600, 15 * 2 ** (job.attempts - 1)) + Math.floor(Math.random() * 10);
      await query(`update ${T.jobs} set status = $2, error_message = $3, logs = $4, locked_by = null, locked_at = null,
                     run_after = now() + ($5 || ' seconds')::interval, completed_at = case when $2 = 'failed' then now() else null end where id = $1`,
      [job.id, retry ? 'queued' : 'failed', msg, JSON.stringify(logs.slice(-200)), String(backoffSec)]);
      if (!retry) {
        // a failed RE-index keeps the previous index searchable instead of taking the source offline
        await query(`update ${T.sources} s set status = case when exists (select 1 from ${T.chunks} c where c.source_id = s.id) then 'indexed' else 'failed' end,
                       error_message = case when exists (select 1 from ${T.chunks} c where c.source_id = s.id) then 'Re-indexing failed; the previous index is still in use. ' || $2 else $2 end
                     where s.id = $1 and s.status <> 'disabled'`, [job.source_id, msg]);
        await recordAudit({ actor: { id: null, email: 'system' }, action: 'job.failed', entityType: 'job', entityId: job.id, entityLabel: job.job_type, details: { sourceId: job.source_id, error: msg }, result: 'failure' });
        await notifyAdmins({ type: 'job_failed', title: 'Processing failed', message: msg, link: `/admin/processing?job=${job.id}`, metadata: { jobId: job.id, sourceId: job.source_id } });
      }
      return retry;
    }
  };
}

/* ------------------------------ admin API ------------------------------ */

const JOB_SELECT = `select j.*, s.title as source_title from ${T.jobs} j left join ${T.sources} s on s.id = j.source_id`;

export async function listJobs({ q, status, type, sourceId }, { limit, offset }) {
  const params = []; const where = [];
  if (q) { params.push(`%${q}%`); where.push(`(j.id::text ilike $${params.length} or s.title ilike $${params.length})`); }
  if (status) { params.push(status); where.push(`j.status = $${params.length}`); }
  if (type) { params.push(type); where.push(`j.job_type = $${params.length}`); }
  if (sourceId) { params.push(sourceId); where.push(`j.source_id = $${params.length}`); }
  const w = where.length ? `where ${where.join(' and ')}` : '';
  const total = (await one(`select count(*)::int as n from ${T.jobs} j left join ${T.sources} s on s.id = j.source_id ${w}`, params)).n;
  const rows = await many(`${JOB_SELECT} ${w} order by j.created_at desc limit ${Number(limit)} offset ${Number(offset)}`, params);
  return { rows: rows.map(r => jobOut({ ...r, logs: undefined, result: undefined })), total };
}

export async function jobStats() {
  return one(`select count(*)::int as total, count(*) filter (where status='queued')::int as queued, count(*) filter (where status='processing')::int as processing,
      count(*) filter (where status='completed')::int as completed, count(*) filter (where status='failed')::int as failed, count(*) filter (where status='cancelled')::int as cancelled
    from ${T.jobs}`);
}

export async function getJob(id) {
  const j = await one(`${JOB_SELECT} where j.id = $1`, [id]);
  if (!j) throw ApiError.notFound('Job not found.');
  const children = await many(`select id, status, created_at from ${T.jobs} where parent_job_id = $1 order by created_at`, [id]);
  return { ...jobOut(j), source: j.source_id ? { id: j.source_id, title: j.source_title } : null, retries: children.map(c => ({ id: c.id, status: c.status, createdAt: c.created_at })) };
}

export async function retryJob(id, actor, req) {
  const j = await one(`select * from ${T.jobs} where id = $1`, [id]);
  if (!j) throw ApiError.notFound('Job not found.');
  if (!['failed', 'cancelled'].includes(j.status)) throw ApiError.conflict(`A ${j.status} job cannot be retried.`);
  const s = await one(`select status from ${T.sources} where id = $1`, [j.source_id]);
  if (!s) throw ApiError.conflict('The source of this job was deleted.');
  if (s.status === 'disabled') throw ApiError.conflict('Re-enable the source before retrying.');
  const job = await enqueueJob({ query }, { sourceId: j.source_id, jobType: j.job_type, requestedBy: actor.id, parentJobId: j.id });
  await recordAudit({ actor, action: 'job.retried', entityType: 'job', entityId: job.id, entityLabel: j.job_type, details: { retryOf: j.id, sourceId: j.source_id }, req });
  return getJob(job.id);
}

export async function cancelJob(id, actor, req) {
  const r = await one(`update ${T.jobs} set status = 'cancelled', completed_at = now(),
      logs = logs || jsonb_build_array(jsonb_build_object('at', now(), 'level', 'warn', 'message', 'Cancelled by an administrator.'))
    where id = $1 and status = 'queued' returning *`, [id]);
  if (!r) {
    const j = await one(`select status from ${T.jobs} where id = $1`, [id]);
    throw j ? ApiError.conflict(`Only queued jobs can be cancelled (this job is ${j.status}).`) : ApiError.notFound('Job not found.');
  }
  // a source whose only job was cancelled goes back to failed/pending state appropriately
  await query(`update ${T.sources} set status = case when chunk_count > 0 then 'indexed' else 'pending' end where id = $1 and status in ('pending')`, [r.source_id]);
  await recordAudit({ actor, action: 'job.cancelled', entityType: 'job', entityId: id, entityLabel: r.job_type, details: { sourceId: r.source_id }, req });
  return getJob(id);
}
