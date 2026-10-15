import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Library, CheckCircle2, Hourglass, AlertTriangle, Layers, CalendarPlus, Plus, BookOpen, ListChecks } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { FilterBar, SearchInput, FilterSelect } from '../../components/common/Filters';
import { EmptyState, ErrorState } from '../../components/common/States';
import { ExportButton, ProgressBar, SourceTypeIcon } from '../../components/common/Misc';
import SourceRowMenu from '../../components/knowledge/SourceRowMenu';
import EditSourceModal from '../../components/knowledge/EditSourceModal';
import SourceBulkBar from '../../components/knowledge/SourceBulkBar';
import SourceHiddenBadge from '../../components/knowledge/SourceHiddenBadge';
import { useSourceActions } from '../../components/knowledge/sourceUtils';
import { getKnowledgeSources, exportKnowledgeSources } from '../../services/knowledgeService';
import { SOURCE_TYPES, SOURCE_STATUSES } from '../../constants/domain';
import { useQuery } from '../../hooks/useQuery';
import { useServerTable } from '../../hooks/useTable';
import { useDebounce, useDocumentTitle } from '../../hooks/useMisc';
import { formatDate, formatNumber, relativeTime, formatDateTime, capitalize } from '../../utils/format';

const SORTS = [
  ['createdAt:desc', 'Newest first'], ['createdAt:asc', 'Oldest first'], ['updatedAt:desc', 'Recently updated'],
  ['title:asc', 'Title A–Z'], ['title:desc', 'Title Z–A'], ['chunkCount:desc', 'Most chunks'], ['chunkCount:asc', 'Fewest chunks']
];
const ADDED = [['all', 'Any time'], ['7d', 'Added last 7 days'], ['30d', 'Added last 30 days'], ['90d', 'Added last 90 days']];

export default function KnowledgePage() {
  useDocumentTitle('Knowledge sources');
  const navigate = useNavigate();
  const [q, setQ] = useState(''); const dq = useDebounce(q);
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [added, setAdded] = useState('all');
  const [owner, setOwner] = useState('all');
  const [editing, setEditing] = useState(null);

  const filters = { q: dq, type, status, added, owner };
  const key = JSON.stringify(filters);
  const t = useServerTable({ pageSize: 10, sort: { key: 'createdAt', dir: 'desc' }, resetKey: key });
  // poll while any source is pending or processing so status and progress stay live
  const { data, loading, error, reload } = useQuery(() => getKnowledgeSources({ ...filters, ...t.query }), [key, t.query], {
    refetchInterval: d => (d && d.meta.stats && (d.meta.stats.pending + d.meta.stats.processing > 0 || d.rows.some(s => s.activeJob)) ? 4000 : false)
  });
  const table = t.bind(data?.rows, data?.meta);
  const stats = data?.meta?.stats;
  const statsLoading = loading && !stats;
  const owners = data?.meta?.owners;
  const actions = useSourceActions();
  const selectedSources = useMemo(() => table.rows.filter(s => table.selected.has(s.id)), [table.rows, table.selected]);
  // the client wants every source except YouTube videos hidden from users: one click selects the rest of this page
  const nonYouTubeIds = table.rows.filter(s => s.type !== 'youtube').map(s => s.id);
  const selectNonYouTube = () => table.selectOnly(nonYouTubeIds);

  const active = !!q || type !== 'all' || status !== 'all' || added !== 'all' || owner !== 'all';
  const clear = () => { setQ(''); setType('all'); setStatus('all'); setAdded('all'); setOwner('all'); };
  const sortValue = table.sort ? `${table.sort.key}:${table.sort.dir}` : 'createdAt:desc';
  const onSort = v => { const [k, dir] = v.split(':'); table.setSort({ key: k, dir }); };

  const exportCsv = () => exportKnowledgeSources({ ...filters, sort: t.sort?.key, dir: t.sort?.dir });

  const columns = [
    {
      key: 'title', header: 'Source', sortable: true, mobile: 'primary', className: 'max-w-[360px]',
      render: s => (
        <span className="flex min-w-0 items-center gap-3">
          <SourceTypeIcon type={s.type} />
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <Link to={`/admin/knowledge/${s.id}`} onClick={e => e.stopPropagation()} className="block min-w-0 truncate font-medium text-ink hover:text-primary-text">{s.title}</Link>
              {s.hideCitations && <SourceHiddenBadge className="shrink-0" />}
            </span>
            <span className="block truncate text-[12.5px] text-muted">{s.tags.length ? s.tags.map(t => `#${t}`).join(' ') : s.description || 'No description'}</span>
          </span>
        </span>
      )
    },
    { key: 'type', header: 'Type', sortable: true, mobile: 'hidden', render: s => <span className="whitespace-nowrap text-muted">{s.typeLabel}</span> },
    { key: 'ownerName', header: 'Owner', render: s => <span className="whitespace-nowrap">{s.ownerName}</span> },
    {
      key: 'status', header: 'Status', sortable: true, mobile: 'secondary',
      render: s => {
        const j = s.activeJob;
        return (
          <span className="flex min-w-[110px] flex-col gap-1.5">
            <StatusBadge status={s.status} />
            {j && j.status === 'processing' && <span className="flex items-center gap-2" title={j.step || undefined}><ProgressBar value={j.progress} tone="info" label={`Processing ${s.title}`} className="w-20" /><span className="text-[11.5px] text-faint">{j.progress}%</span></span>}
            {j && j.status === 'queued' && <span className="text-[11.5px] text-faint">Job queued</span>}
          </span>
        );
      }
    },
    { key: 'createdAt', header: 'Added', sortable: true, render: s => <span className="whitespace-nowrap" title={formatDateTime(s.createdAt)}>{formatDate(s.createdAt)}</span> },
    { key: 'updatedAt', header: 'Updated', sortable: true, render: s => <span className="whitespace-nowrap text-muted" title={formatDateTime(s.updatedAt)}>{relativeTime(s.updatedAt)}</span> },
    { key: 'chunkCount', header: 'Chunks', sortable: true, className: 'text-right tabular-nums', headerClassName: 'text-right', render: s => (s.chunkCount ? formatNumber(s.chunkCount) : <span className="text-faint">—</span>) }
  ];

  if (error) return <Card><ErrorState error={error} onRetry={reload} title="Knowledge sources could not be loaded" /></Card>;

  return (
    <>
      <PageHeader title="Knowledge" accent="sources" description="Admin inventory of every video, document and text resource the assistant can draw on."
        actions={<>
          <ExportButton onExport={exportCsv} disabled={!table.total} />
          <Button variant="primary" icon={Plus} as={Link} to="/admin/knowledge/add">Add source</Button>
        </>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total sources" value={stats?.total} icon={Library} loading={statsLoading} />
        <StatCard label="Indexed" value={stats?.indexed} icon={CheckCircle2} loading={statsLoading} hint="Ready to be used in answers." />
        <StatCard label="Pending processing" value={stats ? stats.pending + stats.processing : undefined} icon={Hourglass} loading={statsLoading} to="/admin/processing" hint="Pending or currently processing." />
        <StatCard label="Failed" value={stats?.failed} icon={AlertTriangle} loading={statsLoading} hint="Need attention or a retry." />
        <StatCard label="Indexed chunks" value={stats?.chunks} icon={Layers} loading={statsLoading} hint="Chunks stored in the search index across indexed sources." />
        <StatCard label="Added last 7 days" value={stats?.recent} icon={CalendarPlus} loading={statsLoading} />
      </div>

      <Card>
        <FilterBar active={active} onClear={clear}
          right={<>
            <Button size="sm" variant="ghost" icon={ListChecks} onClick={selectNonYouTube} disabled={!nonYouTubeIds.length}
              title="Select every source on this page that is not a YouTube video, e.g. to hide them from users">Select all non-YouTube on this page</Button>
            <FilterSelect label="Sort sources" value={sortValue} onChange={onSort} options={SORTS} />
          </>}>
          <SearchInput value={q} onChange={setQ} placeholder="Search title or tags" label="Search sources" />
          <FilterSelect label="Source type" value={type} onChange={setType} options={[['all', 'All types'], ...Object.entries(SOURCE_TYPES).map(([k, v]) => [k, v.label])]} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[['all', 'All statuses'], ...SOURCE_STATUSES.map(s => [s, capitalize(s)])]} />
          <FilterSelect label="Added date" value={added} onChange={setAdded} options={ADDED} />
          <FilterSelect label="Owner" value={owner} onChange={setOwner} options={[['all', 'All owners'], ...(owners || []).map(o => [o.id, o.name])]} />
        </FilterBar>
        <SourceBulkBar sources={selectedSources} onClear={table.clearSelection} />
        <DataTable columns={columns} rows={table.pageRows} table={table} loading={loading} selectable caption="Knowledge sources"
          onRowClick={s => navigate(`/admin/knowledge/${s.id}`)}
          rowActions={s => <SourceRowMenu source={s} activeJob={s.activeJob} actions={actions} onEdit={setEditing} />}
          empty={active
            ? <EmptyState icon={BookOpen} title="No sources match these filters" description="Try a different search term or clear the filters." action={<Button onClick={clear}>Clear filters</Button>} />
            : <EmptyState icon={BookOpen} title="No knowledge sources yet" description="Add a YouTube video, document or text resource to start building the knowledge base." action={<Button variant="primary" icon={Plus} as={Link} to="/admin/knowledge/add">Add source</Button>} />} />
        <Pagination table={table} label="sources" />
      </Card>

      <EditSourceModal open={!!editing} source={editing} onClose={() => setEditing(null)} />
    </>
  );
}
