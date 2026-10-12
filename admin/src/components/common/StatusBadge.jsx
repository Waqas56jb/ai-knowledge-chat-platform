import { cn } from '../../utils/cn';

/* One place that maps every status in the app to a tone and label. */
const MAP = {
  // users
  active: ['success', 'Active'], pending: ['warning', 'Pending'], suspended: ['danger', 'Suspended'], revoked: ['neutral', 'Revoked'],
  // invitations
  accepted: ['success', 'Accepted'], expired: ['neutral', 'Expired'],
  // sources
  processing: ['info', 'Processing'], indexed: ['success', 'Indexed'], failed: ['danger', 'Failed'], disabled: ['neutral', 'Disabled'], deleted: ['neutral', 'Deleted'],
  // jobs
  queued: ['warning', 'Queued'], completed: ['success', 'Completed'], cancelled: ['neutral', 'Cancelled'], running: ['info', 'Running'],
  // conversation outcome
  answered: ['success', 'Answered with sources'], insufficient_evidence: ['warning', 'No supporting evidence'], out_of_scope: ['neutral', 'Out of scope'], error: ['danger', 'Error'],
  // review
  unreviewed: ['neutral', 'Not reviewed'], reviewed: ['success', 'Reviewed'], needs_attention: ['warning', 'Needs attention'], unsupported: ['danger', 'Unsupported answer'], source_mismatch: ['danger', 'Source mismatch'],
  // unanswered questions (content gaps)
  open: ['warning', 'Open'], planned: ['info', 'Planned'], covered: ['success', 'Covered'], dismissed: ['neutral', 'Dismissed'],
  // audit result
  success: ['success', 'Success'], failure: ['danger', 'Failure'],
  // system health
  ready: ['success', 'Ready'], ok: ['success', 'Operational'], not_ready: ['danger', 'Not ready'], down: ['danger', 'Unavailable'], unreachable: ['danger', 'Unreachable'], not_configured: ['warning', 'Not configured']
};

/** <StatusBadge status="active" /> — pass `label` to override the text, `tone` to override the colour. */
export default function StatusBadge({ status, label, tone, dot = true, className }) {
  const [t, l] = MAP[status] || ['neutral', status ? String(status).replace(/_/g, ' ') : '—'];
  return <span className={cn('badge', `badge-${tone || t}`, dot && 'badge-dot', className)}>{label || l}</span>;
}

export const statusLabel = s => (MAP[s] ? MAP[s][1] : s);

/** Small neutral marker, e.g. "Not emailed" or "This browser only". */
export function InfoBadge({ children, className, title }) {
  return <span className={cn('badge badge-primary', className)} title={title}>{children}</span>;
}
