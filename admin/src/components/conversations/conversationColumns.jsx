import { OUTCOMES } from '../../constants/domain';
import { formatDate, formatDateTime, formatTime, relativeTime } from '../../utils/format';
import Avatar from '../common/Avatar';
import StatusBadge from '../common/StatusBadge';

/** DataTable columns for the conversation oversight list. */
export const conversationColumns = [
  {
    key: 'title', header: 'Conversation', sortable: true, mobile: 'primary', className: 'min-w-[220px] max-w-[320px]',
    render: r => (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-ink">{r.title}</span>
        <span className="block truncate text-[12px] text-muted">{r.preview || r.userEmail || ''}</span>
      </span>
    )
  },
  {
    key: 'userName', header: 'User',
    render: r => <span className="inline-flex min-w-0 items-center gap-2"><Avatar name={r.userName} size="xs" /><span className="truncate">{r.userName}</span></span>
  },
  { key: 'messageCount', header: 'Messages', className: 'tabular-nums', render: r => r.messageCount },
  {
    key: 'citationCount', header: 'Citations',
    render: r => (
      <span className="whitespace-nowrap tabular-nums">
        {r.citationCount}
        <span className="text-faint"> · {r.sourceCount} {r.sourceCount === 1 ? 'source' : 'sources'}</span>
      </span>
    )
  },
  {
    key: 'createdAt', header: 'Created', sortable: true, mobile: 'hidden',
    render: r => <time dateTime={r.createdAt} title={formatDateTime(r.createdAt)} className="whitespace-nowrap">{formatDate(r.createdAt)}<span className="ml-1 text-faint">{formatTime(r.createdAt)}</span></time>
  },
  {
    key: 'updatedAt', header: 'Last updated', sortable: true,
    render: r => <time dateTime={r.updatedAt} title={formatDateTime(r.updatedAt)} className="whitespace-nowrap">{relativeTime(r.updatedAt)}</time>
  },
  { key: 'outcome', header: 'Last outcome', mobile: 'secondary', render: r => (r.outcome ? <StatusBadge status={r.outcome} label={OUTCOMES[r.outcome]} /> : <span className="text-faint">—</span>) },
  { key: 'reviewStatus', header: 'Review', mobile: 'secondary', render: r => <StatusBadge status={r.reviewStatus} /> }
];

