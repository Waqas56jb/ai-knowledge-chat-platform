import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '../common/ConfirmDialog';
import { retryProcessingJob, cancelProcessingJob } from '../../services/processingService';
import { jobTypeLabel } from '../../constants/domain';

/** The step currently running (or the last completed / failed one). */
export function currentStep(job) {
  if (!job || !job.steps) return null;
  return job.steps.find(s => s.status === 'running' || s.status === 'failed')
    || (job.status === 'completed' ? job.steps[job.steps.length - 1] : job.steps.find(s => s.status === 'pending'))
    || null;
}

export const progressTone = status => ({ completed: 'success', failed: 'danger', cancelled: 'neutral', processing: 'info' }[status] || 'primary');

/**
 * Actions allowed for a job (the API enforces the same rules): failed/cancelled jobs can be retried
 * (a new job is queued), queued jobs can be cancelled. Retry is blocked with a reason when the source
 * no longer exists.
 */
export function jobCapabilities(job) {
  const retryVisible = job.status === 'failed' || job.status === 'cancelled';
  const sourceGone = !job.sourceId || (!job.sourceTitle && !(job.source && job.source.id));
  const retryBlocker = retryVisible && sourceGone ? 'The source for this job has been deleted.' : null;
  return { retry: retryVisible && !retryBlocker, retryVisible, retryBlocker, cancel: job.status === 'queued' };
}

export function useJobActions({ onRetried } = {}) {
  const confirm = useConfirm();
  const [pending, setPending] = useState(null);

  const retry = useCallback(async job => {
    setPending(`retry:${job.id}`);
    try {
      const next = await retryProcessingJob(job.id);
      toast.success('Retry queued.', { description: `A new ${jobTypeLabel(job.type).toLowerCase()} job was queued.` });
      if (onRetried) onRetried(next);
    }
    catch (err) { toast.error(err.message); }
    finally { setPending(null); }
  }, [onRetried]);

  const cancel = useCallback(async job => {
    const ok = await confirm({ title: 'Cancel job?', message: `This queued ${jobTypeLabel(job.type).toLowerCase()} job will not run. You can retry it later.`, confirmLabel: 'Cancel job', cancelLabel: 'Keep job', danger: true });
    if (!ok) return;
    setPending(`cancel:${job.id}`);
    try { await cancelProcessingJob(job.id); toast.success('Job cancelled.'); }
    catch (err) { toast.error(err.message); }
    finally { setPending(null); }
  }, [confirm]);

  return { retry, cancel, pending };
}
