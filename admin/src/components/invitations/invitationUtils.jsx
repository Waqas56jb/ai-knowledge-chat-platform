import { cn } from '../../utils/cn';
import { formatDate, formatDateTime, relativeTime } from '../../utils/format';

const DAY = 864e5;

/** Human summary of where an invitation is in its lifecycle, e.g. "Expires in 4 days", "Expired 3 days ago". */
export function lifecycleText(inv) {
  switch (inv.status) {
    case 'pending': return `Expires ${relativeTime(inv.expiresAt)}`;
    case 'expired': return `Expired ${relativeTime(inv.expiresAt)}`;
    case 'accepted': return inv.acceptedAt ? `Accepted ${relativeTime(inv.acceptedAt)}` : 'Accepted';
    case 'revoked': return inv.revokedAt ? `Revoked ${relativeTime(inv.revokedAt)}` : 'Revoked';
    default: return '';
  }
}

export const expiresSoon = inv => inv.status === 'pending' && new Date(inv.expiresAt).getTime() - Date.now() < 2 * DAY;

/** Table cell: expiry date with a relative line underneath. */
export function ExpiryCell({ inv }) {
  const soon = expiresSoon(inv);
  return (
    <span className="block whitespace-nowrap">
      <time className="block text-ink" dateTime={inv.expiresAt} title={formatDateTime(inv.expiresAt)}>{formatDate(inv.expiresAt)}</time>
      <span className={cn('block text-[12px]', soon ? 'font-medium text-warning' : 'text-muted')}>{lifecycleText(inv)}</span>
    </span>
  );
}

export const INVITATION_CSV_COLUMNS = [
  { key: 'email', label: 'Recipient email' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'invitedByName', label: 'Invited by' },
  { key: 'createdAt', label: 'Created at' },
  { key: 'expiresAt', label: 'Expires at' },
  { key: 'acceptedAt', label: 'Accepted at' },
  { key: 'revokedAt', label: 'Revoked at' },
  { key: 'resendCount', label: 'Resend count' },
  { key: 'lastSentAt', label: 'Last sent at' }
];
