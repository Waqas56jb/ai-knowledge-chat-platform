import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ban, CalendarX2, MailCheck, MailPlus, Mails, MoreHorizontal, Clock3 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button, { IconButton } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import DropdownMenu from '../../components/common/DropdownMenu';
import StatusBadge from '../../components/common/StatusBadge';
import { Segmented } from '../../components/common/Tabs';
import { FilterBar, FilterSelect, SearchInput } from '../../components/common/Filters';
import { EmptyState, ErrorState } from '../../components/common/States';
import { Notice, ExportButton } from '../../components/common/Misc';
import { useQuery } from '../../hooks/useQuery';
import { useServerTable } from '../../hooks/useTable';
import { useDebounce, useDocumentTitle } from '../../hooks/useMisc';
import { getInvitations, exportInvitations } from '../../services/invitationService';
import { INVITATION_STATUSES } from '../../constants/domain';
import { cn } from '../../utils/cn';
import { capitalize, formatDate, formatDateTime } from '../../utils/format';
import { RoleBadge } from '../../components/users/roles';
import { ExpiryCell } from '../../components/invitations/invitationUtils';
import { useInvitationActions } from '../../components/invitations/useInvitationActions';
import InvitationDetailModal from '../../components/invitations/InvitationDetailModal';

const STAT_CARDS = [
  ['all', 'Total', 'total', Mails],
  ['pending', 'Pending', 'pending', Clock3],
  ['accepted', 'Accepted', 'accepted', MailCheck],
  ['expired', 'Expired', 'expired', CalendarX2],
  ['revoked', 'Revoked', 'revoked', Ban]
];
const STATUS_OPTIONS = [['all', 'All'], ...INVITATION_STATUSES.map(s => [s, capitalize(s)])];

export default function InvitationsPage() {
  useDocumentTitle('Invitations');
  const [params, setParams] = useSearchParams();
  const status = INVITATION_STATUSES.includes(params.get('status')) ? params.get('status') : 'all';
  const focusId = params.get('focus');
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const filters = { q: dq, status };
  const key = JSON.stringify(filters);

  const t = useServerTable({ pageSize: 10, resetKey: key });
  const { data, loading, error, reload } = useQuery(() => getInvitations({ ...filters, ...t.query }), [key, t.query]);
  const table = t.bind(data?.rows, data?.meta);

  const updateParams = changes => setParams(prev => {
    const next = new URLSearchParams(prev);
    Object.entries(changes).forEach(([k, v]) => (v == null || v === 'all' ? next.delete(k) : next.set(k, v)));
    return next;
  }, { replace: true });
  const setStatus = s => updateParams({ status: s });
  const openDetail = inv => updateParams({ focus: inv.id });
  const closeDetail = () => updateParams({ focus: null });
  const actions = useInvitationActions({ onView: openDetail });

  const filtered = !!q || status !== 'all';
  const clear = () => { setQ(''); setStatus('all'); };
  const s = data?.meta?.stats;
  const statsLoading = loading && !s;

  const columns = [
    {
      key: 'email', header: 'Recipient', mobile: 'primary',
      render: i => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-ink">{i.email}</span>
          <span className="block font-mono text-[11.5px] tracking-wide text-faint">token …{i.codeHint}</span>
        </span>
      )
    },
    { key: 'role', header: 'Role', mobile: 'secondary', render: i => <RoleBadge role={i.role} /> },
    { key: 'status', header: 'Status', mobile: 'secondary', render: i => <StatusBadge status={i.status} /> },
    { key: 'invitedByName', header: 'Invited by', className: 'hidden whitespace-nowrap text-muted lg:table-cell', headerClassName: 'hidden lg:table-cell' },
    { key: 'createdAt', header: 'Created', className: 'hidden whitespace-nowrap text-muted xl:table-cell', headerClassName: 'hidden xl:table-cell', render: i => <time dateTime={i.createdAt} title={formatDateTime(i.createdAt)}>{formatDate(i.createdAt)}</time> },
    { key: 'expiresAt', header: 'Expiration', render: i => <ExpiryCell inv={i} /> }
  ];

  const rowActions = i => (
    <DropdownMenu label={`Actions for invitation to ${i.email}`} width="w-60" items={actions.menuItems(i)}
      trigger={p => <IconButton icon={MoreHorizontal} size="sm" tooltip={false} {...p} label={`Actions for invitation to ${i.email}`} />} />
  );

  const header = (
    <PageHeader title="Invitations" description="Invite people to the workspace and track each invitation from sent to accepted."
      actions={<>
        <ExportButton disabled={!table.total} onExport={() => exportInvitations(filters)} />
        <Button as={Link} to="/admin/invitations/new" variant="primary" icon={MailPlus}>New invitation</Button>
      </>} />
  );

  if (error) return <>{header}<Card><ErrorState error={error} onRetry={reload} title="Invitations could not be loaded" /></Card></>;

  return (
    <>
      {header}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {STAT_CARDS.map(([value, label, statKey, Icon]) => (
          <StatCard key={value} label={label} value={s?.[statKey]} icon={Icon} loading={statsLoading}
            to={value === 'all' ? '/admin/invitations' : `/admin/invitations?status=${value}`}
            className={cn(value === 'all' && 'col-span-2 sm:col-span-1', status === value && 'border-primary-strong ring-1 ring-primary-strong')} />
        ))}
      </div>

      <Card>
        <FilterBar active={filtered} onClear={clear}>
          <SearchInput value={q} onChange={setQ} placeholder="Search by email" label="Search invitations by email" />
          <Segmented label="Filter by status" options={STATUS_OPTIONS} value={status} onChange={setStatus} size="sm" className="hidden sm:inline-flex" />
          <FilterSelect label="Filter by status" className="sm:hidden" value={status} onChange={setStatus} options={STATUS_OPTIONS.map(([v, l]) => [v, v === 'all' ? 'All statuses' : l])} />
        </FilterBar>
        <DataTable columns={columns} rows={table.pageRows} table={table} loading={loading} caption="Invitations" getRowLabel={i => i.email}
          onRowClick={openDetail} rowActions={rowActions}
          empty={filtered
            ? <EmptyState icon={Mails} title="No invitations match" description="Try another email or status filter." action={<Button onClick={clear}>Clear filters</Button>} />
            : <EmptyState icon={MailPlus} title="No invitations yet" description="Invite your first teammate to the workspace." action={<Button as={Link} to="/admin/invitations/new" variant="primary" icon={MailPlus}>New invitation</Button>} />} />
        <Pagination table={table} label="invitations" />
      </Card>

      <Notice className="mt-6" title="No email is sent">Invitation links are shown once, when you create or resend an invitation. Copy the link and share it with the recipient yourself.</Notice>

      <InvitationDetailModal invitationId={focusId} onClose={closeDetail} />
      {actions.modals}
    </>
  );
}
