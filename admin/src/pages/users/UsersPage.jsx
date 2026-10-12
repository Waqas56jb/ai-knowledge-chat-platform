import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Ban, MailPlus, MoreHorizontal, UserCheck, UserPlus, Users } from 'lucide-react';
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
import { getUsers, exportUsers } from '../../services/userService';
import { ROLES, USER_STATUSES, roleLabel } from '../../constants/domain';
import { capitalize, formatDate, formatDateTime, formatNumber, relativeTime } from '../../utils/format';
import { RoleBadge } from '../../components/users/roles';
import { useUserActions } from '../../components/users/useUserActions';
import BulkActionsBar from '../../components/users/BulkActionsBar';
import { exportSelectedUsers } from '../../components/users/userCsv';

const SORTS = [
  ['createdAt:desc', 'Newest first'], ['createdAt:asc', 'Oldest first'],
  ['name:asc', 'Name A–Z'], ['name:desc', 'Name Z–A'],
  ['lastActiveAt:desc', 'Recently active'], ['conversationCount:desc', 'Most conversations']
];

export default function UsersPage() {
  useDocumentTitle('Users');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [status, setStatus] = useState(() => (USER_STATUSES.includes(params.get('status')) ? params.get('status') : 'all'));
  const [role, setRole] = useState(() => (ROLES.includes(params.get('role')) ? params.get('role') : 'all'));
  const filters = { q: dq, status, role };
  const key = JSON.stringify(filters);

  const t = useServerTable({ pageSize: 10, sort: { key: 'createdAt', dir: 'desc' }, resetKey: key });
  const { data, loading, error, reload } = useQuery(() => getUsers({ ...filters, ...t.query }), [key, t.query]);
  const table = t.bind(data?.rows, data?.meta);
  const statsData = data?.meta?.stats;
  const actions = useUserActions();

  const selectedUsers = useMemo(() => table.rows.filter(u => table.selected.has(u.id)), [table.rows, table.selected]);
  const filtered = !!q || status !== 'all' || role !== 'all';
  const clear = () => { setQ(''); setStatus('all'); setRole('all'); };
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
    { key: 'role', header: 'Role', sortable: true, mobile: 'secondary', render: u => <RoleBadge role={u.role} /> },
    { key: 'status', header: 'Status', sortable: true, mobile: 'secondary', render: u => <StatusBadge status={u.status} /> },
    { key: 'createdAt', header: 'Created', sortable: true, className: 'hidden whitespace-nowrap text-muted xl:table-cell', headerClassName: 'hidden xl:table-cell', render: u => <time dateTime={u.createdAt} title={formatDateTime(u.createdAt)}>{formatDate(u.createdAt)}</time> },
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
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email or department" label="Search users" />
          <FilterSelect label="Filter by status" value={status} onChange={setStatus} options={[['all', 'All statuses'], ...USER_STATUSES.map(v => [v, capitalize(v)])]} />
          <FilterSelect label="Filter by role" value={role} onChange={setRole} options={[['all', 'All roles'], ...ROLES.map(r => [r, roleLabel(r)])]} />
        </FilterBar>

        <BulkActionsBar users={selectedUsers} onClear={table.clearSelection}
          onExport={() => { const n = exportSelectedUsers(selectedUsers); toast.success(`Exported ${n} selected ${n === 1 ? 'user' : 'users'} to CSV.`); }} />

        <DataTable columns={columns} rows={table.pageRows} table={table} loading={loading} selectable caption="Users"
          onRowClick={u => navigate(`/admin/users/${u.id}`)} rowActions={rowActions}
          empty={filtered
            ? <EmptyState icon={Users} title="No users match your filters" description="Try a different search term, status or role." action={<Button onClick={clear}>Clear filters</Button>} />
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
