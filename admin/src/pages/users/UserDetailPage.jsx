import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, Ban, KeyRound, LayoutGrid, MessagesSquare, MoreHorizontal, PencilLine, RotateCcw, ShieldCheck } from 'lucide-react';
import Button, { IconButton } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import Avatar from '../../components/common/Avatar';
import StatusBadge from '../../components/common/StatusBadge';
import DropdownMenu from '../../components/common/DropdownMenu';
import { Tabs, TabPanel } from '../../components/common/Tabs';
import { ErrorState, Skeleton } from '../../components/common/States';
import NotFoundPage from '../errors/NotFoundPage';
import { useQuery } from '../../hooks/useQuery';
import { useDocumentTitle } from '../../hooks/useMisc';
import { useBreadcrumb } from '../../hooks/useBreadcrumbs';
import { getUserById } from '../../services/userService';
import { formatDate, relativeTime } from '../../utils/format';
import { RoleBadge } from '../../components/users/roles';
import { useUserActions } from '../../components/users/useUserActions';
import UserOverview from '../../components/users/UserOverview';
import { UserAccess, UserActivity, UserConversations } from '../../components/users/UserTabs';

export default function UserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const { data: user, loading, error, reload } = useQuery(() => getUserById(userId), [userId]);
  const actions = useUserActions({ onDeleted: () => navigate('/admin/users', { replace: true }) });
  useDocumentTitle(user ? user.name : 'User');
  useBreadcrumb(userId, user?.name);

  if (error) {
    if (error.status === 404 || error.status === 422) return <NotFoundPage embedded title="User not found" message="This user does not exist or has been deleted." backTo="/admin/users" backLabel="Back to users" />;
    return <><BackLink /><Card><ErrorState error={error} onRetry={reload} title="User could not be loaded" /></Card></>;
  }
  if (loading || !user || user.id !== userId) return <DetailSkeleton />;

  const locked = actions.isProtected(user);
  const canSuspend = user.status === 'active' || user.status === 'pending';
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'activity', label: 'Activity', icon: Activity, count: user.activity.length },
    { id: 'conversations', label: 'Conversations', icon: MessagesSquare, count: user.conversations.length },
    { id: 'access', label: 'Access and invitations', icon: KeyRound }
  ];

  return (
    <>
      <BackLink />
      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={user.name} size="xl" />
          <div className="min-w-0">
            <h1 className="truncate text-[24px] font-semibold leading-tight sm:text-[28px]">{user.name}</h1>
            <p className="mt-0.5 truncate text-[14px] text-muted">{user.email}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <StatusBadge status={user.status} />
              <RoleBadge role={user.role} />
              {locked && <span className="badge badge-neutral">You</span>}
              <span className="text-[12.5px] text-faint">Joined {formatDate(user.createdAt)} · Last active {relativeTime(user.lastActiveAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" icon={PencilLine} onClick={() => actions.edit(user)}>Edit</Button>
          <Button icon={ShieldCheck} onClick={() => actions.changeRole(user)}>Change role</Button>
          {canSuspend
            ? <Button icon={Ban} onClick={() => actions.suspend(user)} disabled={locked} loading={actions.busy === `suspend-${user.id}`} title={locked ? 'You cannot suspend your own account.' : undefined}>Suspend</Button>
            : <Button icon={RotateCcw} onClick={() => actions.reactivate(user)} loading={actions.busy === `reactivate-${user.id}`}>Reactivate</Button>}
          <DropdownMenu label="More actions" width="w-60"
            items={actions.menuItems(user, { includeView: false, includeEdit: false, includeRole: false, includeStatus: false })}
            trigger={p => <IconButton icon={MoreHorizontal} tooltip={false} {...p} label="More actions" />} />
        </div>
      </header>

      <Tabs tabs={tabs} value={tab} onChange={setTab} idPrefix="user" className="mb-6" />
      <TabPanel id="overview" value={tab} idPrefix="user"><UserOverview user={user} onShowAccess={() => setTab('access')} /></TabPanel>
      <TabPanel id="activity" value={tab} idPrefix="user"><UserActivity activity={user.activity} user={user} /></TabPanel>
      <TabPanel id="conversations" value={tab} idPrefix="user"><UserConversations conversations={user.conversations} /></TabPanel>
      <TabPanel id="access" value={tab} idPrefix="user"><UserAccess user={user} /></TabPanel>
      {actions.modals}
    </>
  );
}

function BackLink() {
  return (
    <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-muted transition hover:text-ink">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to users
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading user" className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64 max-w-full" /><Skeleton className="h-5 w-40" /></div>
      </div>
      <Skeleton className="h-10 w-full max-w-lg" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card card-pad space-y-4 lg:col-span-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        <div className="card card-pad space-y-3 lg:col-span-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-20 w-full" /></div>
      </div>
    </div>
  );
}
