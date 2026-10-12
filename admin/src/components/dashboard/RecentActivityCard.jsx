import { Link, useNavigate } from 'react-router-dom';
import {
  LogIn, LogOut, ShieldAlert, MailPlus, Send, MailX, UserCheck, UserCog, UserX, UserMinus, ShieldCheck,
  FilePlus2, FilePen, FileX, FileCheck, Trash2, Cog, RotateCcw, Ban, CircleCheck, TriangleAlert,
  MessagesSquare, StickyNote, Settings, RefreshCcw, Activity, ArrowRight
} from 'lucide-react';
import { CardHeader } from '../common/Card';
import { ActivityTimeline } from '../common/Misc';
import { Skeleton } from '../common/States';
import { actionLabel, getAuditTargetHref } from '../../services/auditService';

/** [icon, tone] per audit action. */
const ACTION_STYLE = {
  'auth.login': [LogIn, 'info'], 'auth.logout': [LogOut, 'neutral'], 'auth.login_failed': [ShieldAlert, 'danger'],
  'invitation.created': [MailPlus, 'primary'], 'invitation.resent': [Send, 'primary'], 'invitation.revoked': [MailX, 'warning'], 'invitation.accepted': [UserCheck, 'success'],
  'user.updated': [UserCog, 'neutral'], 'user.role_changed': [ShieldCheck, 'info'], 'user.suspended': [UserX, 'warning'], 'user.reactivated': [UserCheck, 'success'], 'user.revoked': [UserMinus, 'danger'], 'user.deleted': [Trash2, 'danger'],
  'source.added': [FilePlus2, 'primary'], 'source.updated': [FilePen, 'neutral'], 'source.disabled': [FileX, 'warning'], 'source.enabled': [FileCheck, 'success'], 'source.deleted': [Trash2, 'danger'],
  'job.started': [Cog, 'info'], 'job.retried': [RotateCcw, 'info'], 'job.cancelled': [Ban, 'neutral'], 'job.completed': [CircleCheck, 'success'], 'job.failed': [TriangleAlert, 'danger'],
  'conversation.reviewed': [MessagesSquare, 'success'], 'conversation.note_added': [StickyNote, 'info'],
  'conversation.viewed': [MessagesSquare, 'neutral'], 'profile.updated': [UserCog, 'neutral'],
  'settings.updated': [Settings, 'neutral'], 'settings.reset': [RefreshCcw, 'warning']
};

/** Where clicking an audit event should go. Deleted entities fall back to the audit log. */
export const auditEventLink = l => getAuditTargetHref(l) || '/admin/audit';

/** Latest audit events as a clickable timeline. */
export default function RecentActivityCard({ logs, loading, limit = 7 }) {
  const navigate = useNavigate();
  const items = (logs || []).slice(0, limit).map(l => {
    const [icon, tone] = ACTION_STYLE[l.action] || [Activity, 'neutral'];
    return {
      id: l.id, icon, tone: l.result === 'failure' ? 'danger' : tone, at: l.at,
      title: actionLabel(l.action),
      description: [l.actorName, l.entityLabel, l.description].filter(Boolean).join(' · '),
      onClick: () => navigate(auditEventLink(l))
    };
  });
  return (
    <section className="card flex min-w-0 flex-col">
      <CardHeader title="Recent activity" description="Latest administrative and system events"
        actions={<Link to="/admin/audit" className="link inline-flex items-center gap-1 text-[13px]">View audit log<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>} />
      <div className="px-3 py-3 sm:px-4">
        {loading ? (
          <div className="space-y-4 p-1.5" aria-busy="true" aria-label="Loading activity">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>
            ))}
          </div>
        ) : <ActivityTimeline items={items} emptyText="No audit events recorded yet." />}
      </div>
    </section>
  );
}
