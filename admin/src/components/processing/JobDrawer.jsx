import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink, RotateCcw, XCircle, GitBranch } from 'lucide-react';
import Drawer from './Drawer';
import { JobSteps, JobLogs } from './JobSteps';
import { currentStep, jobCapabilities, progressTone, useJobActions } from './jobUtils';
import Button from '../common/Button';
import { DescriptionList } from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { ErrorState, Skeleton } from '../common/States';
import { ProgressBar, CopyButton } from '../common/Misc';
import { getJobById, isActiveJob } from '../../services/processingService';
import { jobTypeLabel } from '../../constants/domain';
import { useQuery } from '../../hooks/useQuery';
import { formatDateTime, formatDuration } from '../../utils/format';

/** Job details + logs in a side drawer. Opened from the processing table or `?job=<id>`. */
export default function JobDrawer({ jobId, onClose, onOpenJob }) {
  // poll while the job is queued or running so progress and logs stay live
  const { data: job, loading, error, reload } = useQuery(() => (jobId ? getJobById(jobId) : Promise.resolve(null)), [jobId], {
    refetchInterval: d => (d && isActiveJob(d) ? 2000 : false)
  });
  const actions = useJobActions({ onRetried: next => next && onOpenJob && onOpenJob(next.id) });
  const shown = job && job.id === jobId ? job : null;
  const can = shown ? jobCapabilities(shown) : null;

  return (
    <Drawer open={!!jobId} onClose={onClose}
      title={shown ? <span className="font-mono">Job {shown.id.slice(0, 8)}</span> : jobId ? <span className="font-mono">Job {jobId.slice(0, 8)}</span> : 'Job'}
      subtitle={shown && <span className="flex flex-wrap items-center gap-2"><StatusBadge status={shown.status} /><span>{jobTypeLabel(shown.type)}</span></span>}
      footer={shown && <>
        {shown.source && shown.source.id && <Button as={Link} to={`/admin/knowledge/${shown.source.id}`} icon={ExternalLink} onClick={onClose}>Open source</Button>}
        {can.cancel && <Button variant="danger-ghost" icon={XCircle} loading={actions.pending === `cancel:${shown.id}`} onClick={() => actions.cancel(shown)}>Cancel job</Button>}
        {can.retryVisible && <Button variant="primary" icon={RotateCcw} disabled={!can.retry} title={can.retryBlocker || undefined} loading={actions.pending === `retry:${shown.id}`} onClick={() => actions.retry(shown)}>Retry job</Button>}
      </>}>
      {error ? <ErrorState error={error} title={error.status === 404 ? 'Job not found' : 'Job could not be loaded'} onRetry={reload} />
        : loading || !shown ? <DrawerSkeleton />
          : <JobBody job={shown} can={can} onOpenJob={onOpenJob} />}
    </Drawer>
  );
}

function JobBody({ job, can, onOpenJob }) {
  const step = currentStep(job);
  const running = job.status === 'processing';
  return (
    <div className="space-y-6">
      <section aria-label="Progress">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-faint">Progress</p>
            <p className="mt-0.5 text-[14px] text-ink">{job.status === 'queued' ? 'Waiting for a worker' : job.step || (step ? `${running ? 'Current step: ' : ''}${step.name}` : '—')}</p>
          </div>
          <p className="font-display text-[26px] font-semibold leading-none tabular-nums">{job.progress}<span className="text-[15px] text-muted">%</span></p>
        </div>
        <ProgressBar value={job.progress} tone={progressTone(job.status)} label={`Job ${job.id} progress`} className="h-2" />
        {isActiveJob(job) && <p className="mt-2 text-[12.5px] text-muted" aria-live="polite">Updates automatically while the job is active.</p>}
      </section>

      {job.error && (
        <div role="alert" className="flex gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[13px]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <div><p className="font-semibold text-danger">Job failed</p><p className="mt-0.5 text-ink">{job.error}</p></div>
        </div>
      )}
      {can.retryVisible && can.retryBlocker && <p className="rounded-xl border border-line bg-subtle/60 px-4 py-3 text-[13px] text-muted">Retry unavailable: {can.retryBlocker}</p>}

      <DescriptionList columns={2} items={[
        ['Job type', jobTypeLabel(job.type)],
        ['Attempts', job.maxAttempts ? `${job.attempts} of ${job.maxAttempts}` : job.attempts],
        ['Created', formatDateTime(job.createdAt)],
        ['Started', job.startedAt ? formatDateTime(job.startedAt) : 'Not started'],
        ['Finished', job.finishedAt ? formatDateTime(job.finishedAt) : running ? 'Running…' : '—'],
        ['Duration', job.startedAt ? formatDuration(job.startedAt, job.finishedAt) : '—'],
        ['Job ID', <span key="id" className="inline-flex items-center gap-1 font-mono text-[12.5px]">{job.id.slice(0, 8)}…<CopyButton text={job.id} label="Copy job ID" iconOnly /></span>],
        job.parentJobId && ['Retry of', <button key="p" type="button" className="link font-mono text-[12.5px]" onClick={() => onOpenJob && onOpenJob(job.parentJobId)}>{job.parentJobId.slice(0, 8)}</button>]
      ].filter(Boolean)} />

      <section>
        <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-faint">Source</h3>
        {job.source && job.source.title ? (
          <Link to={`/admin/knowledge/${job.source.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-primary/40 hover:bg-subtle/50">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-ink">{job.source.title}</span>
              <span className="block font-mono text-[12px] text-muted">{job.source.id}</span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
          </Link>
        ) : <p className="rounded-xl border border-dashed border-line p-3 text-[13px] text-muted">The source for this job has been deleted.</p>}
      </section>

      <section>
        <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-faint">Steps</h3>
        <JobSteps steps={job.steps} jobStatus={job.status} />
      </section>

      {job.retries && job.retries.length > 0 && (
        <section>
          <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-faint">Retries</h3>
          <ul className="space-y-1.5">
            {job.retries.map(r => (
              <li key={r.id}>
                <button type="button" onClick={() => onOpenJob && onOpenJob(r.id)} className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2 text-left transition hover:border-primary/40 hover:bg-subtle/50">
                  <GitBranch className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
                  <span className="min-w-0 flex-1 font-mono text-[12.5px] text-ink">{r.id.slice(0, 8)}</span>
                  <span className="text-[12px] text-faint" title={formatDateTime(r.createdAt)}>{formatDateTime(r.createdAt)}</span>
                  <StatusBadge status={r.status} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-faint">Logs</h3>
        <JobLogs logs={job.logs} jobId={job.id} />
      </section>
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading job">
      <Skeleton className="h-2 w-full" />
      <div className="grid grid-cols-2 gap-4">{[0, 1, 2, 3].map(i => <div key={i} className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="w-28" /></div>)}</div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
