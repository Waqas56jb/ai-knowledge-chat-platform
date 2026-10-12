import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Play, RotateCcw, Ban, Power, Trash2, AlertTriangle, Loader2, MessagesSquare, LayoutGrid, FileText, Workflow, StickyNote, ArrowUpRight, Download, RefreshCw, History } from 'lucide-react';
import Button from '../../components/common/Button';
import { Card, CardHeader } from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import { Tabs, TabPanel } from '../../components/common/Tabs';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/States';
import { ActivityTimeline, ProgressBar, SourceTypeIcon } from '../../components/common/Misc';
import EditSourceModal from '../../components/knowledge/EditSourceModal';
import SourceOverview from '../../components/knowledge/detail/SourceOverview';
import SourceContent from '../../components/knowledge/detail/SourceContent';
import SourceProcessing from '../../components/knowledge/detail/SourceProcessing';
import SourceNotes from '../../components/knowledge/detail/SourceNotes';
import { isActiveJob, sourceCapabilities, useSourceActions, VISIBILITY_SHORT } from '../../components/knowledge/sourceUtils';
import { currentStep } from '../../components/processing/jobUtils';
import NotFoundPage from '../errors/NotFoundPage';
import { getSourceById } from '../../services/knowledgeService';
import { actionLabel } from '../../services/auditService';
import { jobTypeLabel } from '../../constants/domain';
import { useQuery } from '../../hooks/useQuery';
import { useDocumentTitle } from '../../hooks/useMisc';
import { useBreadcrumb } from '../../hooks/useBreadcrumbs';
import { formatDateTime, relativeTime, pluralize } from '../../utils/format';

export default function SourceDetailPage() {
  const { sourceId } = useParams();
  const navigate = useNavigate();
  // poll while the source is being processed so status, progress and chunks stay live
  const { data: s, loading, error, reload } = useQuery(() => getSourceById(sourceId), [sourceId], {
    refetchInterval: d => (d && (d.status === 'pending' || d.status === 'processing' || d.jobs.some(isActiveJob)) ? 3000 : false)
  });
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const actions = useSourceActions({ onDeleted: () => { setDeleted(true); navigate('/admin/knowledge'); } });
  useBreadcrumb(sourceId, s?.title);
  useDocumentTitle(s ? s.title : 'Knowledge source');

  if (deleted) return null;
  if (error) {
    if (error.status === 404 || error.status === 422) return <NotFoundPage embedded title="Source not found" message="This knowledge source does not exist or has been deleted." backTo="/admin/knowledge" backLabel="Back to knowledge sources" />;
    return <Card><ErrorState error={error} onRetry={reload} /></Card>;
  }
  if (loading || !s || s.id !== sourceId) return <DetailSkeleton />;

  const activeJob = s.jobs.find(isActiveJob);
  const can = sourceCapabilities(s, activeJob);
  const busy = k => actions.pending === `${k}:${s.id}`;
  const processAction = can.start
    ? <Button variant="primary" icon={Play} loading={busy('start')} onClick={() => actions.start(s)}>Start processing</Button>
    : can.retry ? <Button variant="primary" icon={RotateCcw} loading={busy('retry')} onClick={() => actions.retry(s)}>Retry processing</Button>
      : can.reindex ? <Button icon={RefreshCw} loading={busy('start')} onClick={() => actions.start(s, true)}>Re-index</Button> : null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'content', label: 'Content', icon: FileText, count: s.chunkCount || undefined },
    { id: 'processing', label: 'Processing', icon: Workflow, count: s.jobs.length || undefined },
    { id: 'conversations', label: 'Related conversations', icon: MessagesSquare, count: s.relatedConversations.length },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'activity', label: 'Activity', icon: History, count: s.activity.length || undefined }
  ];

  return (
    <>
      <Link to="/admin/knowledge" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Knowledge sources</Link>

      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <SourceTypeIcon type={s.type} size="lg" className="mt-1" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="break-words text-[24px] font-semibold leading-tight sm:text-[28px]">{s.title}</h1>
              <StatusBadge status={s.status} />
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-muted">
              <span>{s.typeLabel}</span><span aria-hidden="true">·</span>
              <span>{VISIBILITY_SHORT[s.visibility]}</span><span aria-hidden="true">·</span>
              <span>Added by {s.ownerName}</span><span aria-hidden="true">·</span>
              <span title={formatDateTime(s.updatedAt)}>Updated {relativeTime(s.updatedAt)}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button icon={Pencil} onClick={() => setEditing(true)}>Edit details</Button>
          {can.download && <Button icon={Download} loading={busy('download')} onClick={() => actions.download(s)}>Download</Button>}
          {can.enable && <Button icon={Power} loading={busy('enable')} onClick={() => actions.enable(s)}>Re-enable</Button>}
          {can.disable && <Button icon={Ban} loading={busy('disable')} onClick={() => actions.disable(s)}>Disable</Button>}
          <Button variant="danger-ghost" icon={Trash2} loading={busy('delete')} onClick={() => actions.remove(s)}>Delete</Button>
          {processAction}
        </div>
      </header>

      {s.status === 'failed' && (
        <div role="alert" className="mb-6 flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-5 py-4 sm:flex-row sm:items-center">
          <AlertTriangle className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-danger">Processing failed</p>
            <p className="mt-0.5 text-[13.5px] text-ink">{s.error || 'The last processing job failed. Open Processing for the job logs.'}</p>
          </div>
          {can.retry && <Button variant="danger" icon={RotateCcw} loading={busy('retry')} onClick={() => actions.retry(s)} className="shrink-0">Retry</Button>}
        </div>
      )}
      {s.status === 'disabled' && (
        <div role="note" className="mb-6 flex gap-3 rounded-2xl border border-line bg-subtle px-5 py-4 text-[13.5px]">
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <p className="text-muted"><b className="font-semibold text-ink">Disabled.</b> This source is kept but is not used for answers until it is re-enabled.</p>
        </div>
      )}
      {activeJob && <LiveJob job={activeJob} />}

      <Tabs tabs={tabs} value={tab} onChange={setTab} idPrefix="source" className="mb-6" />
      <TabPanel id="overview" value={tab} idPrefix="source"><SourceOverview source={s} /></TabPanel>
      <TabPanel id="content" value={tab} idPrefix="source"><SourceContent source={s} action={processAction} /></TabPanel>
      <TabPanel id="processing" value={tab} idPrefix="source"><SourceProcessing source={s} /></TabPanel>
      <TabPanel id="conversations" value={tab} idPrefix="source"><RelatedConversations items={s.relatedConversations} /></TabPanel>
      <TabPanel id="notes" value={tab} idPrefix="source"><SourceNotes source={s} /></TabPanel>
      <TabPanel id="activity" value={tab} idPrefix="source"><SourceActivity source={s} /></TabPanel>

      <EditSourceModal open={editing} source={s} onClose={() => setEditing(false)} />
    </>
  );
}

function LiveJob({ job }) {
  const step = currentStep(job);
  const queued = job.status === 'queued';
  return (
    <section aria-label="Live processing" className="mb-6 rounded-2xl border border-info/30 bg-info-soft/50 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-info shadow-card"><Loader2 className={queued ? 'h-4 w-4' : 'h-4 w-4 animate-spin'} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink">{queued ? 'Queued for processing' : 'Processing'}</p>
            <p className="text-[13px] text-muted">{jobTypeLabel(job.type)} · <span className="font-mono">{job.id.slice(0, 8)}</span>{!queued && (job.step || step) ? ` · ${job.step || step.name}` : ''}</p>
          </div>
        </div>
        <Link to={`/admin/processing?job=${job.id}`} className="link inline-flex items-center gap-1 text-[13px]">View job<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
      </div>
      <div className="mt-3 flex items-center gap-3" aria-live="polite">
        <ProgressBar value={job.progress} tone="info" label="Processing progress" className="h-2" />
        <span className="w-10 text-right text-[13px] font-semibold tabular-nums text-ink">{job.progress}%</span>
      </div>
    </section>
  );
}

function SourceActivity({ source }) {
  const items = source.activity.map(a => ({
    id: a.id, title: actionLabel(a.action), description: [a.description, a.actorName].filter(Boolean).join(' · '), at: a.at, tone: a.result === 'failure' ? 'danger' : 'neutral'
  }));
  return (
    <Card>
      <CardHeader title="Activity" icon={History} description="Audit events recorded for this source, newest first."
        actions={<Link to={`/admin/audit?entity=source&entityId=${encodeURIComponent(source.id)}`} className="link text-[13px]">Open in audit logs</Link>} />
      <div className="card-pad"><ActivityTimeline items={items} emptyText="No audit events for this source yet." /></div>
    </Card>
  );
}

function RelatedConversations({ items }) {
  return (
    <Card>
      <CardHeader title="Related conversations" icon={MessagesSquare} description="Conversations where answers cited this source." />
      {items.length ? (
        <ul className="divide-y divide-line">
          {items.map(c => (
            <li key={c.id}>
              <Link to={`/admin/conversations/${c.id}`} className="flex flex-col gap-1 px-5 py-3.5 transition hover:bg-subtle/60 sm:flex-row sm:items-center sm:gap-4">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink">{c.title}</span>
                  <span className="block text-[12.5px] text-muted">{c.userName || 'Deleted user'} · <span title={formatDateTime(c.updatedAt)}>{relativeTime(c.updatedAt)}</span></span>
                </span>
                <span className="badge badge-primary self-start sm:self-auto">{pluralize(c.citations, 'citation')}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={MessagesSquare} compact title="Not cited yet" description="No conversation has cited this source so far." />}
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading source" className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-4"><Skeleton className="h-11 w-11 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-7 w-72 max-w-full" /><Skeleton className="w-96 max-w-full" /></div></div>
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-6 xl:grid-cols-3"><div className="card card-pad space-y-3 xl:col-span-2">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="w-full" />)}</div><div className="card card-pad space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="w-full" />)}</div></div>
    </div>
  );
}
