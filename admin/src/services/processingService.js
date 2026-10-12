/**
 * Processing jobs — /admin/processing. Jobs are run by the server's worker; the UI polls while any
 * job is queued or processing.
 */
import { apiGet, apiList, apiPost, downloadCsv } from './api';
import { PIPELINE_STEPS } from '../constants/domain';

export const isActiveJob = j => !!j && (j.status === 'queued' || j.status === 'processing');

/**
 * Step list derived from the job's progress and status (the server reports one `step` string and a
 * 0–100 progress; the pipeline order is fixed).
 */
export function jobSteps(job) {
  const done = Math.floor(((job.progress || 0) / 100) * PIPELINE_STEPS.length);
  return PIPELINE_STEPS.map((name, i) => {
    let status = 'pending';
    if (job.status === 'completed' || i < done) status = 'completed';
    else if (i === done) status = job.status === 'processing' ? 'running' : job.status === 'failed' ? 'failed' : 'pending';
    return { name, status };
  });
}

export const mapJob = j => j && ({
  ...j,
  sourceTitle: j.sourceTitle || (j.source && j.source.title) || null,
  finishedAt: j.completedAt || null,
  steps: jobSteps(j),
  logs: j.logs || []
});

const listQuery = ({ q, status, type, sourceId, page, pageSize } = {}) => ({ q: q && q.trim(), status, type, sourceId, page, pageSize });

/** Filters: { q, status, type, sourceId, page, pageSize } → { rows, meta } (meta.stats) */
export async function getJobs(filters = {}) {
  const { rows, meta } = await apiList('/admin/processing', listQuery(filters));
  return { rows: rows.map(mapJob), meta };
}

export const exportJobs = filters => downloadCsv('/admin/processing', listQuery(filters), 'processing-jobs');

export async function getJobById(id) {
  return mapJob(await apiGet(`/admin/processing/${encodeURIComponent(id)}`));
}

/** stats: { total, queued, processing, completed, failed, cancelled } */
export async function getJobStats() {
  const { meta } = await apiList('/admin/processing', { pageSize: 1 });
  return { total: 0, queued: 0, processing: 0, completed: 0, failed: 0, cancelled: 0, ...(meta.stats || {}) };
}

/** Failed/cancelled → a new queued job (parentJobId = id). */
export async function retryProcessingJob(id) { return mapJob(await apiPost(`/admin/processing/${encodeURIComponent(id)}/retry`)); }

/** Queued only. */
export async function cancelProcessingJob(id) { return mapJob(await apiPost(`/admin/processing/${encodeURIComponent(id)}/cancel`)); }
