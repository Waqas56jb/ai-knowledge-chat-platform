import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleDot, CalendarClock, CheckCircle2, Ban, MessageCircleQuestion, Eye, Plus, SearchX } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button, { IconButton } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { Segmented } from '../../components/common/Tabs';
import { FilterBar, FilterSelect, SearchInput } from '../../components/common/Filters';
import { EmptyState, ErrorState } from '../../components/common/States';
import { ExportButton, Notice } from '../../components/common/Misc';
import GapDrawer from '../../components/contentGaps/GapDrawer';
import { GapIndicators } from '../../components/contentGaps/gapUtils';
import { useQuery } from '../../hooks/useQuery';
import { useServerTable } from '../../hooks/useTable';
import { useDebounce, useDocumentTitle } from '../../hooks/useMisc';
import { getContentGaps, exportContentGaps, GAP_STATUSES, GAP_STATUS_LABELS } from '../../services/contentGapService';
import { cn } from '../../utils/cn';
import { formatDate, formatDateTime, formatNumber, relativeTime } from '../../utils/format';

const STAT_CARDS = [
  ['open', 'Open', CircleDot, 'Not answered yet and not triaged as planned, covered or dismissed.'],
  ['planned', 'Planned', CalendarClock, 'Content is being prepared.'],
  ['covered', 'Covered', CheckCircle2, 'Marked as covered by new content.'],
  ['dismissed', 'Dismissed', Ban, 'Out of scope or not worth covering.']
];
const STATUS_OPTIONS = [['all', 'All'], ...GAP_STATUSES.map(s => [s, GAP_STATUS_LABELS[s]])];
const RANGES = [['all', 'Any time'], ['7d', 'Asked in last 7 days'], ['30d', 'Asked in last 30 days'], ['90d', 'Asked in last 90 days']];
const SORTS = [
  ['lastAskedAt:desc', 'Last asked'], ['askCount:desc', 'Times asked'], ['userCount:desc', 'Most users'],
  ['firstAskedAt:desc', 'First asked (newest)'], ['firstAskedAt:asc', 'First asked (oldest)'], ['question:asc', 'Question A–Z']
];

export default function ContentGapsPage() {
  useDocumentTitle('Unanswered questions');
  const [params, setParams] = useSearchParams();
  const status = GAP_STATUSES.includes(params.get('status')) ? params.get('status') : 'all';
  const gapId = params.get('gap');
  const [q, setQ] = useState(''); const dq = useDebounce(q);
  const [range, setRange] = useState('all');

  const setParam = useCallback((k, v, opts) => setParams(p => { const n = new URLSearchParams(p); if (v == null || v === 'all') n.delete(k); else n.set(k, v); return n; }, opts), [setParams]);
  const setStatus = v => setParam('status', v, { replace: true });
  const openGap = g => setParam('gap', g.id);
  const closeGap = () => setParam('gap', null, { replace: true });

  const filters = { q: dq, status, range };
  const key = JSON.stringify(filters);
  const t = useServerTable({ pageSize: 25, sort: { key: 'lastAskedAt', dir: 'desc' }, resetKey: key });
  const { data, loading, error, reload } = useQuery(() => getContentGaps({ ...filters, ...t.query }), [key, t.query]);
  const table = t.bind(data?.rows, data?.meta);
  const stats = data?.meta?.stats;
  const statsLoading = loading && !stats;

  const active = !!q || status !== 'all' || range !== 'all';
  const clear = () => { setQ(''); setRange('all'); setStatus('all'); };
  const sortValue = t.sort ? `${t.sort.key}:${t.sort.dir}` : 'lastAskedAt:desc';

  const columns = [
    {
      key: 'question', header: 'Question', sortable: true, mobile: 'primary', className: 'min-w-[260px] max-w-[460px]',
      render: g => (
        <span className="block min-w-0">
          <span className="line-clamp-2 font-medium text-ink">{g.question}</span>
          {(g.answeredSince || g.askedAgainAfterCovered || g.note) && (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              <GapIndicators gap={g} />
              {g.note && <span className="truncate text-[12px] text-muted" title={g.note}>{g.note}</span>}
            </span>
          )}
        </span>
      )
    },
    { key: 'askCount', header: 'Times asked', sortable: true, className: 'tabular-nums', headerClassName: 'whitespace-nowrap', render: g => formatNumber(g.askCount) },
    { key: 'userCount', header: 'Users', sortable: true, className: 'tabular-nums', render: g => formatNumber(g.userCount) },
    { key: 'firstAskedAt', header: 'First asked', sortable: true, mobile: 'hidden', className: 'hidden whitespace-nowrap text-muted xl:table-cell', headerClassName: 'hidden xl:table-cell', render: g => <time dateTime={g.firstAskedAt} title={formatDateTime(g.firstAskedAt)}>{formatDate(g.firstAskedAt)}</time> },
    { key: 'lastAskedAt', header: 'Last asked', sortable: true, className: 'whitespace-nowrap text-muted', render: g => <time dateTime={g.lastAskedAt} title={formatDateTime(g.lastAskedAt)}>{relativeTime(g.lastAskedAt)}</time> },
    { key: 'status', header: 'Status', mobile: 'secondary', render: g => <StatusBadge status={g.status} label={GAP_STATUS_LABELS[g.status]} /> }
  ];

  const header = (
    <PageHeader title="Unanswered" accent="questions" description="Questions your knowledge base couldn't answer. Use them to plan new content."
      actions={<>
        <ExportButton disabled={!table.total} onExport={() => exportContentGaps({ ...filters, sort: t.sort?.key, dir: t.sort?.dir })} />
        <Button as={Link} to="/admin/knowledge/add" variant="primary" icon={Plus}>Add content</Button>
      </>} />
  );

  if (error) return <>{header}<Card><ErrorState error={error} onRetry={reload} title="Unanswered questions could not be loaded" /></Card></>;

  return (
    <>
      {header}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {STAT_CARDS.map(([s, label, Icon, hint]) => (
          <StatCard key={s} label={label} value={stats?.[s]} icon={Icon} loading={statsLoading} hint={hint} to={`/admin/content-gaps?status=${s}`}
            className={cn(status === s && 'border-primary-strong ring-1 ring-primary-strong')} />
        ))}
        <StatCard label="Asked in last 7 days" value={stats?.askedLast7Days} icon={MessageCircleQuestion} loading={statsLoading}
          hint={stats ? `${formatNumber(stats.unansweredQuestions)} unanswered questions in total` : undefined} className="col-span-2 sm:col-span-1" />
      </div>

      <Card>
        <FilterBar active={active} onClear={clear}
          right={<FilterSelect label="Sort questions" value={sortValue} onChange={v => { const [k, d] = v.split(':'); table.setSort({ key: k, dir: d }); }}
            options={SORTS.some(([v]) => v === sortValue) ? SORTS : [[sortValue, 'Custom sort'], ...SORTS]} />}>
          <SearchInput value={q} onChange={setQ} placeholder="Search questions" label="Search unanswered questions" />
          <Segmented label="Filter by status" options={STATUS_OPTIONS} value={status} onChange={setStatus} size="sm" className="hidden sm:inline-flex" />
          <FilterSelect label="Filter by status" className="sm:hidden" value={status} onChange={setStatus} options={STATUS_OPTIONS.map(([v, l]) => [v, v === 'all' ? 'All statuses' : l])} />
          <FilterSelect label="Asked within" value={range} onChange={setRange} options={RANGES} />
        </FilterBar>
        <DataTable columns={columns} rows={table.pageRows} table={table} loading={loading} caption="Unanswered questions" getRowLabel={g => g.question}
          onRowClick={openGap}
          rowActions={g => <IconButton icon={Eye} size="sm" label="View question details" onClick={() => openGap(g)} />}
          empty={active
            ? <EmptyState icon={SearchX} title="No questions match these filters" description="Try another status, time range or search term." action={<Button onClick={clear}>Clear filters</Button>} />
            : <EmptyState icon={MessageCircleQuestion} title="No unanswered questions" description="When users ask something the knowledge base can't answer, the question appears here." />} />
        <Pagination table={table} label="questions" sizes={[10, 25, 50, 100]} />
      </Card>

      <Notice className="mt-6" title="How this list is built">
        Questions are grouped ignoring case and punctuation. They come from user conversations, so a question disappears if its conversations are deleted.
      </Notice>

      <GapDrawer gapId={gapId} onClose={closeGap} />
    </>
  );
}
