import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Ban, Briefcase, MailPlus, MoreHorizontal, UserCheck, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';
import Button, { IconButton } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import DropdownMenu from '../../components/common/DropdownMenu';
import StatusBadge from '../../components/common/StatusBadge';
import Avatar from '../../components/common/Avatar';
import { FilterBar, FilterSelect, SearchInput } from '../../components/common/Filters';
import { EmptyState, ErrorState } from '../../components/common/States';
import { ExportButton } from '../../components/common/Misc';
import { useQuery } from '../../hooks/useQuery';
import { useServerTable } from '../../hooks/useTable';
import { useDebounce, useDocumentTitle } from '../../hooks/useMisc';
import { getUsers, exportUsers, getInsightOptions } from '../../services/userService';
import { BUSINESS_STAGES, BUSINESS_STAGE_LABELS, ROLES, USER_STATUSES, roleLabel } from '../../constants/domain';
import { Segmented } from '../../components/common/Tabs';
import { capitalize, formatDate, formatDateTime, formatNumber, relativeTime } from '../../utils/format';
import { RoleBadge } from '../../components/users/roles';
import { useUserActions } from '../../components/users/useUserActions';
import BulkActionsBar from '../../components/users/BulkActionsBar';
import { exportSelectedUsers } from '../../components/users/userCsv';

const SORTS = [
  ['createdAt:desc', 'Newest first'], ['createdAt:asc', 'Oldest first'],
  ['name:asc', 'Name A–Z'], ['name:desc', 'Name Z–A'],
  ['lastActiveAt:desc', 'Recently active'], ['conversationCount:desc', 'Most conversations'],
  ['businessName:asc', 'Business A–Z'], ['country:asc', 'Country A–Z']
];

/** Business-profile filters: [URL / API param, label, insight-options key, "all" label]. */
const PROFILE_SELECTS = [
  ['country', 'Country', 'countries', 'All countries'],
  ['state', 'State', 'states', 'All states'],
  ['businessType', 'Business type', 'businessTypes', 'All business types'],
  ['product', 'Product', 'products', 'All products'],
  ['clientType', 'Client type', 'clientTypes', 'All client types']
];
const PROFILE_KEYS = [...PROFILE_SELECTS.map(([k]) => k), 'stage', 'hasProfile'];

/** [value, "Label (count)"] options; the current URL value is kept even if it is no longer in the list. */
function countOptions(list, current, allLabel) {
  const opts = (list || []).map(o => [o.value, `${o.value} (${o.count})`]);
  if (current !== 'all' && !opts.some(([v]) => v.toLowerCase() === current.toLowerCase())) opts.unshift([current, current]);
  return [['all', allLabel], ...opts];
}

const joinParts = parts => parts.filter(Boolean).join(', ');

export default function UsersPage() {
  useDocumentTitle('Users');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(() => params.get('q') || '');
  const dq = useDebounce(q);

  // Select filters live in the URL so KPI links, back navigation and shared links keep them.
  const param = (k, allowed) => { const v = (params.get(k) || '').trim(); return v && (!allowed || allowed.includes(v)) ? v : 'all'; };
  const status = param('status', USER_STATUSES);
  const role = param('role', ROLES);
  const profile = {
    ...Object.fromEntries(PROFILE_SELECTS.map(([k]) => [k, param(k)])),
    stage: param('stage', BUSINESS_STAGES),
    hasProfile: param('hasProfile', ['true', 'false'])
  };
  const setFilter = (k, v) => setParams(prev => { const p = new URLSearchParams(prev); if (!v || v === 'all') p.delete(k); else p.set(k, v); return p; }, { replace: true });
  const filters = { q: dq, status, role, ...profile };
  const key = JSON.stringify(filters);
  const options = useQuery(getInsightOptions, []);

  const t = useServerTable({ pageSize: 10, sort: { key: 'createdAt', dir: 'desc' }, resetKey: key });
  const { data, loading, error, reload } = useQuery(() => getUsers({ ...filters, ...t.query }), [key, t.query]);
  const table = t.bind(data?.rows, data?.meta);
  const statsData = data?.meta?.stats;
  const actions = useUserActions();

  const selectedUsers = useMemo(() => table.rows.filter(u => table.selected.has(u.id)), [table.rows, table.selected]);
  const profileFiltered = PROFILE_KEYS.some(k => profile[k] !== 'all');
  const filtered = !!q || status !== 'all' || role !== 'all' || profileFiltered;
  const clear = () => { setQ(''); setParams({}, { replace: true }); };
  const sortValue = table.sort ? `${table.sort.key}:${table.sort.dir}` : 'createdAt:desc';
  const s = statsData ? { total: statsData.total, active: statsData.active, suspended: statsData.suspended, pendingInvitations: statsData.pending_invitations } : null;
  const statsLoading = loading && !s;

  const columns = [
    {
      key: 'name', header: 'User', sortable: true, mobile: 'primary',
      render: u => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={u.name} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">{u.name}</span>
            <span className="block truncate text-[12.5px] text-muted lg:hidden">{u.email}</span>
            {u.department && <span className="hidden truncate text-[12.5px] text-muted lg:block">{u.department}</span>}
          </span>
        </span>
      )
    },
    { key: 'email', header: 'Email', sortable: true, mobile: 'hidden', className: 'hidden max-w-[240px] truncate text-muted lg:table-cell', headerClassName: 'hidden lg:table-cell' },
    {
      key: 'businessName', header: 'Business', sortable: true, className: 'hidden max-w-[220px] lg:table-cell', headerClassName: 'hidden lg:table-cell',
      render: u => (u.business.name || u.business.type
        ? (
          <span className="block min-w-0">
            <span className="block truncate text-ink" title={u.business.name || undefined}>{u.business.name || <span className="text-faint">Unnamed</span>}</span>
            {u.business.type && <span className="block truncate text-[12.5px] text-muted" title={u.business.type}>{u.business.type}</span>}
          </span>
        )
        : <span className="text-faint">—</span>)
    },
    {
      key: 'country', header: 'Location', sortable: true, className: 'hidden max-w-[200px] text-muted xl:table-cell', headerClassName: 'hidden xl:table-cell',
      render: u => { const loc = joinParts([u.business.city, u.business.state, u.business.country]); return loc ? <span className="block truncate" title={loc}>{loc}</span> : <span className="text-faint">—</span>; }
    },
    { key: 'role', header: 'Role', sortable: true, mobile: 'secondary', render: u => <RoleBadge role={u.role} /> },
    { key: 'status', header: 'Status', sortable: true, mobile: 'secondary', render: u => <StatusBadge status={u.status} /> },
    { key: 'createdAt', header: 'Created', sortable: true, className: 'hidden whitespace-nowrap text-muted 2xl:table-cell', headerClassName: 'hidden 2xl:table-cell', render: u => <time dateTime={u.createdAt} title={formatDateTime(u.createdAt)}>{formatDate(u.createdAt)}</time> },
    { key: 'lastActiveAt', header: 'Last active', sortable: true, className: 'whitespace-nowrap text-muted', render: u => u.lastActiveAt ? <time dateTime={u.lastActiveAt} title={formatDateTime(u.lastActiveAt)}>{relativeTime(u.lastActiveAt)}</time> : <span className="text-faint">Never</span> },
    { key: 'conversationCount', header: 'Conversations', sortable: true, className: 'tabular-nums', headerClassName: 'whitespace-nowrap', render: u => formatNumber(u.conversationCount) }
  ];

  const rowActions = u => (
    <DropdownMenu label={`Actions for ${u.name}`} width="w-60" items={actions.menuItems(u)}
      trigger={p => <IconButton icon={MoreHorizontal} size="sm" tooltip={false} {...p} label={`Actions for ${u.name}`} />} />
  );

  if (error) return (
    <>
      <PageHeader title="Users" description="Manage who can use the workspace." />
      <Card><ErrorState error={error} onRetry={reload} title="Users could not be loaded" /></Card>
    </>
  );

  return (
    <>
      <PageHeader title="Users" description="Manage who can access the workspace, their roles and their status."
        actions={<>
          <ExportButton disabled={!table.total} onExport={() => exportUsers({ ...filters, sort: t.sort?.key, dir: t.sort?.dir })} />
          <Button as={Link} to="/admin/invitations/new" variant="primary" icon={UserPlus}>Invite user</Button>
        </>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={s?.total} icon={Users} loading={statsLoading} hint="Every account in the workspace" />
        <StatCard label="Active" value={s?.active} icon={UserCheck} loading={statsLoading} hint="Users who can currently sign in" />
        <StatCard label="Suspended" value={s?.suspended} icon={Ban} loading={statsLoading} hint="Temporarily blocked from the workspace" />
        <StatCard label="Pending invitations" value={s?.pendingInvitations} icon={MailPlus} loading={statsLoading} to="/admin/invitations?status=pending" hint="Invitations waiting to be accepted" />
      </div>

      <Card>
        <FilterBar active={filtered} onClear={clear}
          right={<FilterSelect label="Sort users" className="md:hidden" value={sortValue} onChange={v => { const [k, d] = v.split(':'); table.setSort({ key: k, dir: d }); }}
            options={SORTS.some(([v]) => v === sortValue) ? SORTS : [[sortValue, 'Custom sort'], ...SORTS]} />}>
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, department or business name" label="Search users" />
          <FilterSelect label="Filter by status" value={status} onChange={v => setFilter('status', v)} options={[['all', 'All statuses'], ...USER_STATUSES.map(v => [v, capitalize(v)])]} />
          <FilterSelect label="Filter by role" value={role} onChange={v => setFilter('role', v)} options={[['all', 'All roles'], ...ROLES.map(r => [r, roleLabel(r)])]} />
        </FilterBar>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3" role="group" aria-label="Business profile filters">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted"><Briefcase className="h-3.5 w-3.5" aria-hidden="true" />Business profile</span>
          <Segmented size="sm" label="Has a business profile" value={profile.hasProfile} onChange={v => setFilter('hasProfile', v)}
            options={[['all', 'Any'], ['true', 'Has profile'], ['false', 'No profile']]} />
          {PROFILE_SELECTS.map(([k, label, optKey, allLabel]) => (
            <FilterSelect key={k} label={`Filter by ${label.toLowerCase()}`} value={profile[k]} onChange={v => setFilter(k, v)}
              options={countOptions(options.data?.[optKey], profile[k], options.loading && !options.data ? 'Loading…' : allLabel)} />
          ))}
          <FilterSelect label="Filter by stage" value={profile.stage} onChange={v => setFilter('stage', v)}
            options={[['all', 'All stages'], ...(options.data?.stages || BUSINESS_STAGES).map(s => [s, BUSINESS_STAGE_LABELS[s] || capitalize(s)])]} />
          {options.error && <span className="text-[12.5px] text-danger" role="alert">Filter values could not be loaded. <button type="button" className="link" onClick={options.reload}>Retry</button></span>}
        </div>

        <BulkActionsBar users={selectedUsers} onClear={table.clearSelection}
          onExport={() => { const n = exportSelectedUsers(selectedUsers); toast.success(`Exported ${n} selected ${n === 1 ? 'user' : 'users'} to CSV.`); }} />

        <DataTable columns={columns} rows={table.pageRows} table={table} loading={loading} selectable caption="Users"
          onRowClick={u => navigate(`/admin/users/${u.id}`)} rowActions={rowActions}
          empty={filtered
            ? <EmptyState icon={Users} title="No users match your filters" description={profileFiltered ? 'Try different business-profile filters, or clear them. Profiles are built automatically from each user’s conversations.' : 'Try a different search term, status or role.'} action={<Button onClick={clear}>Clear filters</Button>} />
            : <EmptyState icon={Users} title="No users yet" description="Invite people to the workspace to get started." action={<Button as={Link} to="/admin/invitations/new" variant="primary" icon={UserPlus}>Invite user</Button>} />} />
        <Pagination table={table} label="users" />
      </Card>

      <p className="mt-4 text-[12.5px] text-faint">
        Roles, suspensions and revocations take effect on the server immediately and are recorded in the audit log. You cannot change your own account or remove the last active administrator.
      </p>
      {actions.modals}
    </>
  );
}
