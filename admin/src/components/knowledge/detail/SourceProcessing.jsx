import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Loader2, Plus, Ban, Clock3, Workflow, History } from 'lucide-react';
import { Card, CardHeader } from '../../common/Card';
import StatusBadge from '../../common/StatusBadge';
import { ActivityTimeline, ProgressBar } from '../../common/Misc';
import { EmptyState } from '../../common/States';
import { jobTypeLabel } from '../../../constants/domain';
import { formatDateTime, formatDuration, relativeTime } from '../../../utils/format';
import { progressTone } from '../../processing/jobUtils';

const JOB_EVENT = {
  queued: [Clock3, 'warning', 'queued'], processing: [Loader2, 'info', 'started'], completed: [CheckCircle2, 'success', 'completed'],
  failed: [AlertTriangle, 'danger', 'failed'], cancelled: [Ban, 'neutral', 'cancelled']
};

/** Lifecycle events derived from the source's timestamps and its processing jobs (newest first). */
function lifecycle(s) {
  const events = [{ id: 'added', icon: Plus, tone: 'primary', title: 'Source added', description: `by ${s.ownerName}`, at: s.createdAt }];
  s.jobs.forEach(j => {
    events.push({ id: `${j.id}-created`, icon: Clock3, tone: 'warning', title: `${jobTypeLabel(j.type)} queued`, description: j.parentJobId ? 'Retry of an earlier job' : null, at: j.createdAt });
    if (j.startedAt) events.push({ id: `${j.id}-started`, icon: Loader2, tone: 'info', title: `${jobTypeLabel(j.type)} started`, description: j.attempts > 1 ? `Attempt ${j.attempts}` : null, at: j.startedAt });
    if (j.completedAt && JOB_EVENT[j.status]) {
      const [icon, tone, verb] = JOB_EVENT[j.status];
      events.push({ id: `${j.id}-done`, icon, tone, title: `${jobTypeLabel(j.type)} ${verb}`, description: j.error || null, at: j.completedAt });
    }
  });
  if (s.indexedAt) events.push({ id: 'indexed', icon: CheckCircle2, tone: 'success', title: 'Indexed', description: <StatusBadge status="indexed" />, at: s.indexedAt });
  return events.filter(e => e.at).sort((a, b) => new Date(b.at) - new Date(a.at));
}

/** Processing tab: lifecycle timeline plus every job for the source. */
export default function SourceProcessing({ source: s }) {
  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader title="Lifecycle" icon={History} description="Newest first" />
        <div className="card-pad"><ActivityTimeline items={lifecycle(s)} emptyText="No history recorded." /></div>
      </Card>
      <Card className="xl:col-span-3">
        <CardHeader title="Processing jobs" icon={Workflow} description="Runs for this source, newest first" actions={<Link to="/admin/processing" className="link text-[13px]">All jobs</Link>} />
        {s.jobs.length ? (
          <ul className="divide-y divide-line">
            {s.jobs.map(j => (
              <li key={j.id}>
                <Link to={`/admin/processing?job=${j.id}`} className="flex flex-col gap-2 px-5 py-3.5 transition hover:bg-subtle/60 sm:flex-row sm:items-center sm:gap-4">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2"><span className="font-mono text-[12.5px] font-semibold text-ink" title={j.id}>{j.id.slice(0, 8)}</span><StatusBadge status={j.status} /></span>
                    <span className="mt-0.5 block text-[12.5px] text-muted">{jobTypeLabel(j.type)} · created <span title={formatDateTime(j.createdAt)}>{relativeTime(j.createdAt)}</span> · attempt {j.attempts}{j.step && j.status === 'processing' ? ` · ${j.step}` : ''}</span>
                    {j.error && <span className="mt-0.5 block truncate text-[12.5px] text-danger">{j.error}</span>}
                  </span>
                  <span className="flex items-center gap-3 sm:w-56">
                    <ProgressBar value={j.progress} tone={progressTone(j.status)} label={`${j.id} progress`} />
                    <span className="w-9 text-right text-[12px] tabular-nums text-muted">{j.progress}%</span>
                    <span className="w-14 text-right text-[12px] tabular-nums text-faint">{j.startedAt ? formatDuration(j.startedAt, j.finishedAt) : '—'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={Workflow} compact title="No jobs yet" description="Start processing to create a job." />}
      </Card>
    </div>
  );
}
