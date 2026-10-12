import { Link } from 'react-router-dom';
import { TriangleAlert, MessageSquareWarning, MessageCircleQuestion, MailOpen, UserX, ChevronRight, CircleCheck } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Skeleton } from '../common/States';
import { cn } from '../../utils/cn';
import { formatNumber } from '../../utils/format';

const TONES = { danger: 'bg-danger-soft text-danger', warning: 'bg-warning-soft text-warning', info: 'bg-info-soft text-info', neutral: 'bg-subtle text-muted' };

/** Counts that usually need an administrator's follow-up, each linking to the relevant page. */
export default function NeedsAttentionCard({ stats, loading }) {
  const rows = stats ? [
    { key: 'jobs', icon: TriangleAlert, label: 'Failed processing jobs', value: stats.failedJobs, to: '/admin/processing?status=failed', tone: 'danger' },
    { key: 'review', icon: MessageSquareWarning, label: 'Conversations flagged for review', value: stats.needsReview, to: '/admin/conversations?review=flagged', tone: 'warning' },
    { key: 'gaps', icon: MessageCircleQuestion, label: 'Open unanswered questions', value: stats.openGaps, to: '/admin/content-gaps?status=open', tone: 'warning' },
    { key: 'invites', icon: MailOpen, label: 'Pending invitations', value: stats.pendingInvitations, to: '/admin/invitations?status=pending', tone: 'info' },
    { key: 'suspended', icon: UserX, label: 'Suspended users', value: stats.suspendedUsers, to: '/admin/users?status=suspended', tone: 'neutral' }
  ] : [];
  const allClear = rows.length > 0 && rows.every(r => !r.value);
  return (
    <Card className="flex min-w-0 flex-1 flex-col">
      <CardHeader title="Needs attention" description="Items waiting for an administrator" />
      {loading ? (
        <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : allClear ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-8 text-center">
          <CircleCheck className="h-6 w-6 text-success" aria-hidden="true" />
          <p className="text-[13.5px] text-muted">Nothing needs your attention right now.</p>
        </div>
      ) : (
        <ul className="flex-1 p-2">
          {rows.map(({ icon: Icon, ...r }) => (
            <li key={r.key}>
              <Link to={r.to} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-subtle">
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', r.value ? TONES[r.tone] : TONES.neutral)}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{r.label}</span>
                <b className={cn('font-display text-[16px] font-semibold', r.value ? 'text-ink' : 'text-faint')}>{formatNumber(r.value)}</b>
                <ChevronRight className="h-4 w-4 text-faint transition group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
