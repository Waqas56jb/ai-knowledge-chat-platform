import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Ban, BookLock, Briefcase, Library, MailCheck, MailPlus, MailX, MessagesSquare, PencilLine, RotateCcw, Send, ShieldCheck, Trash2, UserX } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { ActivityTimeline, SourceTypeIcon } from '../common/Misc';
import { EmptyState } from '../common/States';
import Button from '../common/Button';
import { sourceTypeLabel } from '../../constants/domain';
import { actionLabel } from '../../services/auditService';
import { formatDate, formatDateTime, pluralize, relativeTime } from '../../utils/format';
import { RoleBadge } from './roles';
import { sourceAccessSummary } from './UserOverview';

const ACTION_STYLE = {
  'user.updated': [PencilLine, 'neutral'], 'user.role_changed': [ShieldCheck, 'primary'],
  'user.suspended': [Ban, 'danger'], 'user.reactivated': [RotateCcw, 'success'], 'user.revoked': [UserX, 'warning'], 'user.deleted': [Trash2, 'danger'],
  'user.business_profile_updated': [Briefcase, 'neutral'], 'user.business_profile_refreshed': [Briefcase, 'info'], 'user.business_profile_cleared': [Briefcase, 'warning'],
  'invitation.created': [MailPlus, 'info'], 'invitation.resent': [Send, 'info'], 'invitation.accepted': [MailCheck, 'success'], 'invitation.revoked': [MailX, 'warning']
};

export function UserActivity({ activity, user = {} }) {
  const items = activity.map(a => {
    const [icon, tone] = ACTION_STYLE[a.action] || [Activity, 'neutral'];
    return { id: a.id, icon, tone: a.result === 'failure' ? 'danger' : tone, title: actionLabel(a.action), description: [a.description, `by ${a.actorName}`].filter(Boolean).join(' · '), at: a.at };
  });
  return (
    <Card>
      <CardHeader title="Activity" icon={Activity} description="Administrative events recorded for this user in the audit log."
        actions={<Button size="sm" variant="ghost" as={Link} to={`/admin/audit?entity=user&entityId=${encodeURIComponent(user.id || '')}`} iconRight={ArrowRight}>Audit log</Button>} />
      <div className="card-pad">
        {items.length
          ? <ActivityTimeline items={items} />
          : <EmptyState compact icon={Activity} title="No recorded activity" description="Profile edits, role changes and status changes will appear here." />}
      </div>
    </Card>
  );
}

export function UserConversations({ conversations }) {
  return (
    <Card>
      <CardHeader title="Conversations" icon={MessagesSquare} description="Chats this user started with the assistant." />
      {conversations.length ? (
        <ul className="divide-y divide-line">
          {[...conversations].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map(c => (
            <li key={c.id}>
              <Link to={`/admin/conversations/${c.id}`} className="group flex flex-col gap-2 px-5 py-3.5 transition hover:bg-subtle/60 sm:flex-row sm:items-center sm:gap-4">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink group-hover:text-primary-text">{c.title}</span>
                  <span className="block text-[12.5px] text-muted">
                    {pluralize(c.messageCount, 'message')} · <time dateTime={c.updatedAt} title={formatDateTime(c.updatedAt)}>updated {relativeTime(c.updatedAt)}</time>
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {c.outcome && <StatusBadge status={c.outcome} />}
                  <StatusBadge status={c.reviewStatus} dot={false} />
                  <ArrowRight className="hidden h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink sm:block" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState compact icon={MessagesSquare} title="No conversations yet" description="Conversations appear here once this user starts asking questions." />}
    </Card>
  );
}

export function UserAccess({ user }) {
  const restricted = user.sourceAccess === 'restricted';
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title="Knowledge-source access" icon={restricted ? BookLock : Library} description={sourceAccessSummary(user)} />
        <div className="border-b border-line px-5 py-3 text-[13px] text-muted">
          {restricted
            ? 'This user can only use the sources selected for them. Access lists are managed on each knowledge source.'
            : 'This user can use every knowledge source shared with the workspace, plus restricted sources they were added to. Private sources are excluded.'}
        </div>
        {user.accessibleSources.length ? (
          <ul className="divide-y divide-line">
            {user.accessibleSources.map(s => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                <SourceTypeIcon type={s.type} size="sm" />
                <span className="min-w-0 flex-1">
                  <Link to={`/admin/knowledge/${s.id}`} className="block truncate text-[13.5px] font-medium text-ink hover:text-primary-text hover:underline">{s.title}</Link>
                  <span className="block text-[12px] text-muted">{sourceTypeLabel(s.type)}</span>
                </span>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        ) : <EmptyState compact icon={Library} title="No accessible sources" description="Share a knowledge source with this user to give them something to ask about." action={<Button size="sm" as={Link} to="/admin/knowledge">Open knowledge base</Button>} />}
      </Card>

      <Card>
        <CardHeader title="Invitation history" icon={MailPlus} description="Invitations sent to this email address." />
        {user.invitations.length ? (
          <ul className="divide-y divide-line">
            {[...user.invitations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(i => (
              <li key={i.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="kbd text-[12px]" title="Last 4 characters of the invitation token">…{i.codeHint}</code>
                  <StatusBadge status={i.status} />
                  <RoleBadge role={i.role} />
                  <Link to={`/admin/invitations?focus=${i.id}`} className="link ml-auto text-[12.5px]">Details</Link>
                </div>
                <p className="mt-1.5 text-[12.5px] text-muted">
                  Sent {formatDate(i.createdAt)}
                  {i.status === 'accepted' && i.acceptedAt && <> · accepted {formatDate(i.acceptedAt)}</>}
                  {i.status === 'revoked' && i.revokedAt && <> · revoked {formatDate(i.revokedAt)}</>}
                  {(i.status === 'pending' || i.status === 'expired') && <> · {i.status === 'pending' ? 'expires' : 'expired'} {relativeTime(i.expiresAt)}</>}
                  {i.resendCount > 0 && <> · resent {pluralize(i.resendCount, 'time')}</>}
                </p>
              </li>
            ))}
          </ul>
        ) : <EmptyState compact icon={MailPlus} title="No invitations" description="This user was added directly, without an invitation." />}
      </Card>
    </div>
  );
}
