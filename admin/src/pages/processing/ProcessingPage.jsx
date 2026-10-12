import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Cpu, Clock3, Loader2, CheckCircle2, AlertTriangle, MoreHorizontal, Eye, RotateCcw, XCircle, ExternalLink, Workflow } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import DropdownMenu from '../../components/common/DropdownMenu';
import { FilterBar, SearchInput, FilterSelect } from '../../components/common/Filters';
import { EmptyState, ErrorState } from '../../components/common/States';
import { ExportButton, ProgressBar } from '../../components/common/Misc';
import JobDrawer from '../../components/processing/JobDrawer';
import { jobCapabilities, progressTone, useJobActions } from '../../components/processing/jobUtils';
import { getJobs, exportJobs } from '../../services/processingService';
import { JOB_TYPES, JOB_STATUSES, jobTypeLabel } from '../../constants/domain';
import { useQuery } from '../../hooks/useQuery';
import { useServerTable } from '../../hooks/useTable';
import { useDebounce, useDocumentTitle } from '../../hooks/useMisc';
import { cn } from '../../utils/cn';
import { capitalize, formatDateTime, formatDuration, relativeTime } from '../../utils/format';

const STAT_CARDS = [
  ['all', 'Total jobs', 'total', Cpu],
  ['queued', 'Queued', 'queued', Clock3],
  ['processing', 'Processing', 'processing', Loader2],
  ['completed', 'Completed', 'completed', CheckCircle2],
  ['failed', 'Failed', 'failed', AlertTriangle]
];

/** Re-render every second while something is running so live durations tick. */
function useTicker(active) {
  const [, setN] = useState(0);
  useEffect(() => { if (!active) return undefined; const t = setInterval(() => setN(n => n + 1), 1000); return () => clearInterval(t); }, [active]);
}

export default function ProcessingPage() {
  useDocumentTitle('Processing jobs');
  const [params, setParams] = useSearchParams();
  const jobParam = params.get('job');
  const statusParam = params.get('status');
  const status = JOB_STATUSES.includes(statusParam) ? statusParam : 'all';
  const [q, setQ] = useState(''); const dq = useDebounce(q);
  const [type, setType] = useState('all');

  const setParam = useCallback((k, v, opts) => setParams(p => { const n = new URLSearchParams(p); if (v == null || v === 'all') n.delete(k); else n.set(k, v); return n; }, opts), [setParams]);
  const setStatus = v => setParam('status', v, { replace: true });
  const openJob = useCallback(id => setParam('job', id), [setParam]);
  const closeJob = useCallback(() => setParam('job', null, { replace: true }), [setParam]);

  const filters = { q: dq, status, type };
  const key = JSON.stringify(filters);
  const t = useServerTable({ pageSize: 10, resetKey: key });
  // poll while any job is queued or processing
  const { data, loading, error, reload } = useQuery(() => getJobs({ ...filters, ...t.query }), [key, t.query], {
    refetchInterval: d => (d && d.meta.stats && (d.meta.stats.queued + d.meta.stats.processing > 0) ? 3000 : false)
  });
  const table = t.bind(data?.rows, data?.meta);
  const stats = data?.meta?.stats;
  const statsLoading = loading && !stats;
  const actions = useJobActions({ onRetried: next => next && openJob(next.id) });
  useTicker(!!stats?.processing);

  const active = !!q || status !== 'all' || type !== 'all';
  const clear = () => { setQ(''); setType('all'); setStatus('all'); };

  const exportCsv = () => exportJobs(filters);

  const columns = [
    { key: 'id', header: 'Job ID', mobile: 'hidden', render: j => <span className="whitespace-nowrap font-mono text-[12.5px] text-ink" title={j.id}>{j.id.slice(0, 8)}</span> },
    {
      key: 'sourceTitle', header: 'Source', mobile: 'primary', className: 'max-w-[280px]',
      render: j => (
        <span className="block min-w-0">
          {j.sourceTitle
            ? <Link to={`/admin/knowledge/${j.sourceId}`} onClick={e => e.stopPropagation()} className="block truncate font-medium text-ink hover:text-primary-text">{j.sourceTitle}</Link>
            : <span className="block truncate italic text-muted">Deleted source</span>}
          <span className="block truncate font-mono text-[11.5px] text-faint md:hidden">{j.id.slice(0, 8)}{j.status === 'processing' && j.step ? ` · ${j.step}` : ''}</span>
        </span>
      )
    },
    { key: 'type', header: 'Job type', render: j => <span className="whitespace-nowrap text-muted">{jobTypeLabel(j.type)}</span> },
    { key: 'status', header: 'Status', mobile: 'secondary', render: j => <StatusBadge status={j.status} /> },
    {
      key: 'progress', header: 'Progress',
      render: j => <span className="flex min-w-[120px] items-center gap-2"><ProgressBar value={j.progress} tone={progressTone(j.status)} label={`${j.id} progress`} className="w-20" /><span className="w-9 text-right text-[12px] tabular-nums text-muted">{j.progress}%</span></span>
    },
    { key: 'createdAt', header: 'Created', render: j => <span className="whitespace-nowrap" title={formatDateTime(j.createdAt)}>{relativeTime(j.createdAt)}</span> },
    {
      key: 'duration', header: 'Duration',
      render: j => (j.startedAt
        ? <span className={cn('whitespace-nowrap tabular-nums', j.status === 'processing' ? 'text-info' : 'text-muted')}>{formatDuration(j.startedAt, j.finishedAt)}</span>
        : <span className="text-faint">—</span>)
    }
  ];

  const rowMenu = j => {
    const can = jobCapabilities(j);
    return (
      <DropdownMenu label={`Actions for job ${j.id.slice(0, 8)}`} trigger={p => <button type="button" {...p} className="icon-btn icon-btn-sm"><MoreHorizontal aria-hidden="true" /></button>}
        items={[
          { label: 'View details & logs', icon: Eye, onClick: () => openJob(j.id) },
          j.sourceTitle && { label: 'Open source', icon: ExternalLink, to: `/admin/knowledge/${j.sourceId}` },
          (can.retryVisible || can.cancel) && { divider: true },
          can.retryVisible && { label: 'Retry job', icon: RotateCcw, disabled: !can.retry, hint: can.retry ? undefined : 'Blocked', onClick: () => actions.retry(j) },
          can.cancel && { label: 'Cancel job', icon: XCircle, danger: true, onClick: () => actions.cancel(j) }
        ]} />
    );
  };

  if (error) return <Card><ErrorState error={error} onRetry={reload} title="Processing jobs could not be loaded" /></Card>;

  return (
    <>
      <PageHeader title="Processing" accent="jobs" description="Transcript extraction, parsing, chunking and indexing runs for every knowledge source."
        actions={<ExportButton onExport={exportCsv} disabled={!table.total} />} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STAT_CARDS.map(([st, label, k, Icon]) => (
          <StatCard key={st} label={label} value={stats?.[k]} icon={Icon} loading={statsLoading}
            to={st === 'all' ? '/admin/processing' : `/admin/processing?status=${st}`}
            className={cn(status === st && 'border-primary ring-4 ring-primary/15')} />
        ))}
      </div>

      <Card>
        <FilterBar active={active} onClear={clear}>
          <SearchInput value={q} onChange={setQ} placeholder="Search job ID or source title" label="Search jobs" />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[['all', 'All statuses'], ...JOB_STATUSES.map(s => [s, capitalize(s)])]} />
          <FilterSelect label="Job type" value={type} onChange={setType} options={[['all', 'All job types'], ...Object.entries(JOB_TYPES)]} />
        </FilterBar>
        <DataTable columns={columns} rows={table.pageRows} table={table} loading={loading} caption="Processing jobs" getRowLabel={j => `job ${j.id.slice(0, 8)}`}
          onRowClick={j => openJob(j.id)} rowActions={rowMenu}
          empty={active
            ? <EmptyState icon={Workflow} title="No jobs match these filters" description="Try another status, job type or search term." action={<Button onClick={clear}>Clear filters</Button>} />
            : <EmptyState icon={Workflow} title="No processing jobs yet" description="Jobs appear here when a knowledge source is added or reprocessed." action={<Button variant="primary" as={Link} to="/admin/knowledge/add">Add source</Button>} />} />
        <Pagination table={table} label="jobs" />
      </Card>

      <JobDrawer jobId={jobParam} onClose={closeJob} onOpenJob={openJob} />
    </>
  );
}
