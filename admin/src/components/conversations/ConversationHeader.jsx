import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Clock, MessageSquare, Quote } from 'lucide-react';
import { OUTCOMES } from '../../constants/domain';
import { formatDateTime, relativeTime, pluralize } from '../../utils/format';
import Avatar from '../common/Avatar';
import StatusBadge from '../common/StatusBadge';
import { CopyButton } from '../common/Misc';
import ReviewStatusMenu from './ReviewStatusMenu';

/** Detail-page header: back link, title, user, timestamps, badges and the Review action. */
export default function ConversationHeader({ conversation: c }) {
  const meta = [
    [CalendarClock, 'Started', formatDateTime(c.createdAt), c.createdAt],
    [Clock, 'Last message', relativeTime(c.updatedAt), c.updatedAt],
    [MessageSquare, null, pluralize(c.messageCount, 'message')],
    [Quote, null, pluralize(c.citationCount, 'citation')]
  ];
  return (
    <header className="mb-6">
      <Link to="/admin/conversations" className="inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to conversations
      </Link>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {c.outcome && <StatusBadge status={c.outcome} label={OUTCOMES[c.outcome]} />}
            <StatusBadge status={c.reviewStatus} />
            <span className="inline-flex items-center gap-1 font-mono text-[12px] text-faint">{c.id}<CopyButton iconOnly text={c.id} label="Copy conversation ID" successMessage="Conversation ID copied." /></span>
          </div>
          <h1 className="mt-2 break-words text-[24px] font-semibold leading-tight sm:text-[28px]">{c.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted">
            <span className="inline-flex items-center gap-2">
              <Avatar name={c.userName} size="xs" />
              {c.user ? <Link to={`/admin/users/${encodeURIComponent(c.user.id)}`} className="link">{c.user.name}</Link> : <span>{c.userName}</span>}
              {c.user?.email && <span className="hidden text-faint sm:inline">{c.user.email}</span>}
            </span>
            {meta.map(([Icon, label, value, at]) => (
              <span key={value} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
                {label && <span className="text-faint">{label}</span>}
                {at ? <time dateTime={at} title={formatDateTime(at)}>{value}</time> : value}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ReviewStatusMenu conversationId={c.id} current={c.reviewStatus} />
        </div>
      </div>
    </header>
  );
}
