/**
 * In-process worker: polls the job table, runs up to WORKER_CONCURRENCY jobs at once, recovers stale
 * jobs every minute and drains gracefully on shutdown. Safe to run on several server instances because
 * jobs are claimed with FOR UPDATE SKIP LOCKED.
 */
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { claimNextJob, recoverStaleJobs } from '../services/processing.service.js';
import { runJob } from './processSource.job.js';
import { runCleanup } from './cleanup.job.js';

let timer = null, maintenance = null, stopping = false;
const active = new Set();

async function tick() {
  if (stopping) return;
  try {
    while (!stopping && active.size < env.WORKER_CONCURRENCY) {
      const job = await claimNextJob();
      if (!job) break;
      const p = runJob(job).catch(e => logger.error({ jobId: job.id, err: { message: e.message } }, 'job crashed')).finally(() => active.delete(p));
      active.add(p);
    }
  } catch (e) {
    logger.error({ err: { code: e.code, message: e.message } }, 'worker poll failed');
  } finally {
    if (!stopping) timer = setTimeout(tick, env.WORKER_POLL_MS);
  }
}

export function startWorker() {
  if (timer || !env.WORKER_ENABLED) return;
  stopping = false;
  recoverStaleJobs().catch(() => {});
  maintenance = setInterval(() => { recoverStaleJobs().catch(() => {}); runCleanup().catch(() => {}); }, 60000);
  timer = setTimeout(tick, 500);
  logger.info({ concurrency: env.WORKER_CONCURRENCY }, 'processing worker started');
}

/** Stop claiming new jobs and wait (bounded) for running ones. */
export async function stopWorker(timeoutMs = 20000) {
  stopping = true;
  clearTimeout(timer); clearInterval(maintenance); timer = null;
  if (active.size) await Promise.race([Promise.allSettled([...active]), new Promise(r => setTimeout(r, timeoutMs))]);
}

/** For tests/scripts: process queued jobs until the queue is empty (or timeout). */
export async function drainQueue({ timeoutMs = 120000 } = {}) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const job = await claimNextJob();
    if (!job) return;
    await runJob(job);
  }
}
