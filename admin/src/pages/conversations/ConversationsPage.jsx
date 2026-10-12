import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CircleDashed, Eye, MessagesSquare, SearchX } from 'lucide-react';
import { getConversations, exportConversations } from '../../services/conversationService';
import { getAllUsers } from '../../services/userService';
import { OUTCOMES, REVIEW_STATUSES, SOURCE_GROUPS } from '../../constants/domain';
import { useQuery } from '../../hooks/useQuery';
import { useServerTable } from '../../hooks/useTable';
import { useDebounce, useDocumentTitle } from '../../hooks/useMisc';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import { FilterBar, SearchInput, FilterSelect } from '../../components/common/Filters';
import { Notice, ExportButton } from '../../components/common/Misc';
import { EmptyState, ErrorState } from '../../components/common/States';
import { conversationColumns } from '../../components/conversations/conversationColumns';

const RANGES = [['all', 'All time'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['90d', 'Last 90 days']];
const OPTIONS = {
  range: RANGES.map(([v]) => v),
  outcome: ['all', ...Object.keys(OUTCOMES)],
  review: ['all', 'flagged', ...Object.keys(REVIEW_STATUSES)],
  source: ['all', ...Object.keys(SOURCE_GROUPS)]
};

export default function ConversationsPage() {
  useDocumentTitle('Conversations');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(() => params.get('q') || '');
  const dq = useDebounce(q);

  // Select filters live in the URL so KPI links, back navigation and shared links keep them.
  const param = (k, allowed) => { const v = params.get(k); return v && (!allowed || allowed.includes(v)) ? v : 'all'; };
  const range = param('range', OPTIONS.range);
  const userId = param('user');
  const sourceGroup = param('source', OPTIONS.source);
  const outcome = param('outcome', OPTIONS.outcome);
  const review = param('review', OPTIONS.review);
  const setFilter = (k, v) => setParams(prev => { const p = new URLSearchParams(prev); if (v === 'all') p.delete(k); else p.set(k, v); return p; }, { replace: true });

  const filters = { q: dq, range, userId, sourceGroup, outcome, review };
  const key = JSON.stringify(filters);
  const t = useServerTable({ pageSize: 10, sort: { key: 'updatedAt', dir: 'desc' }, resetKey: key });
  const { data, loading, error, reload } = useQuery(() => getConversations({ ...filters, ...t.query }), [key, t.query]);
  const table = t.bind(data?.rows, data?.meta);
  const st = data?.meta?.stats;
  const stats = { data: st ? { total: st.total, needsReview: st.needs_review, unreviewed: st.unreviewed } : null, loading: loading && !st };
  const { data: users } = useQuery(() => getAllUsers(), []);

  const active = !!q || [range, userId, sourceGroup, outcome, review].some(v => v !== 'all');
  const clear = () => { setQ(''); setParams({}, { replace: true }); };

  if (error) return <Card><ErrorState error={error} onRetry={reload} title="Conversations could not be loaded" /></Card>;

  return (
    <>
      <PageHeader title="Conversations" description="Administrative oversight of conversations: check answers against their cited sources and record review decisions."
        actions={<ExportButton disabled={!table.total} onExport={() => exportConversations({ ...filters, sort: t.sort?.key, dir: t.sort?.dir })} />} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total conversations" value={stats.data?.total} loading={stats.loading} icon={MessagesSquare} />
        <StatCard label="Needing review" value={stats.data?.needsReview} loading={stats.loading} icon={AlertTriangle}
          hint="Flagged as needs attention, unsupported answer or source mismatch." to="/admin/conversations?review=flagged" />
        <StatCard label="Not yet reviewed" value={stats.data?.unreviewed} loading={stats.loading} icon={CircleDashed} to="/admin/conversations?review=unreviewed" />
      </div>

      <Notice title="Privacy" className="mb-6">
        These are real user conversations. Opening one is an administrative action and is recorded in the audit log. This console offers no impersonation or sign-in-as-user features.
      </Notice>

      <Card>
        <FilterBar active={active} onClear={clear}>
          <SearchInput value={q} onChange={setQ} placeholder="Search titles or users" label="Search conversations" />
          <FilterSelect label="Date range" value={range} onChange={v => setFilter('range', v)} options={RANGES} />
          <FilterSelect label="User" value={userId} onChange={v => setFilter('user', v)} options={[['all', 'All users'], ...(users || []).map(u => [u.id, u.name])]} />
          <FilterSelect label="Source type" value={sourceGroup} onChange={v => setFilter('source', v)} options={[['all', 'All source types'], ...Object.entries(SOURCE_GROUPS)]} />
          <FilterSelect label="Query outcome" value={outcome} onChange={v => setFilter('outcome', v)} options={[['all', 'All outcomes'], ...Object.entries(OUTCOMES)]} />
          <FilterSelect label="Review status" value={review} onChange={v => setFilter('review', v)}
            options={[['all', 'All review statuses'], ['flagged', 'Needing review (any flag)'], ...Object.entries(REVIEW_STATUSES)]} />
        </FilterBar>
        <DataTable columns={conversationColumns} rows={table.pageRows} table={table} loading={loading} caption="Conversations"
          onRowClick={r => navigate(`/admin/conversations/${encodeURIComponent(r.id)}`)}
          rowActions={r => <Button as={Link} to={`/admin/conversations/${encodeURIComponent(r.id)}`} size="sm" variant="ghost" icon={Eye} aria-label={`View ${r.title}`}>View</Button>}
          empty={active
            ? <EmptyState icon={SearchX} title="No conversations match these filters" description="Try a wider date range or clear the filters." action={<Button onClick={clear}>Clear filters</Button>} />
            : <EmptyState icon={MessagesSquare} title="No conversations yet" description="Conversations appear here once users start asking the assistant questions." />} />
        <Pagination table={table} label="conversations" />
      </Card>
    </>
  );
}
