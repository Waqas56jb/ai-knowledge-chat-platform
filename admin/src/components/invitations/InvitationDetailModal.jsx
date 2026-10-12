import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { MailX, Send } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { DescriptionList } from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { Notice } from '../common/Misc';
import { ErrorState, Skeleton } from '../common/States';
import { useQuery } from '../../hooks/useQuery';
import { getInvitationById } from '../../services/invitationService';
import { formatDateTime, pluralize } from '../../utils/format';
import { RoleBadge } from '../users/roles';
import { lifecycleText } from './invitationUtils';
import { useInvitationActions } from './useInvitationActions';
import { InvitationLink } from './InvitationSuccess';

/** Full invitation details with copy buttons and status-appropriate actions. */
export default function InvitationDetailModal({ invitationId, onClose }) {
  const open = !!invitationId;
  // keep showing the last invitation while the dialog animates closed
  const last = useRef(invitationId);
  if (invitationId) last.current = invitationId;
  const shownId = last.current;
  const { data: inv, loading, error, reload } = useQuery(() => (shownId ? getInvitationById(shownId) : Promise.resolve(null)), [shownId]);
  const a = useInvitationActions();
  const ready = !!inv && inv.id === shownId;

  const footer = ready && (
    <>
      {a.canRevoke(inv) && <Button variant="danger-ghost" icon={MailX} className="sm:mr-auto" loading={a.busy === `revoke-${inv.id}`} onClick={async () => { if (await a.revoke(inv)) onClose(); }}>Revoke</Button>}
      {a.canResend(inv) && <Button variant="primary" icon={Send} loading={a.busy === `resend-${inv.id}`} onClick={() => a.resend(inv)}>{inv.status === 'expired' ? 'Renew and get link' : 'Resend (new link)'}</Button>}
      {!a.canResend(inv) && <Button onClick={onClose}>Close</Button>}
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Invitation details" description={ready ? inv.email : undefined} size="lg" footer={footer}>
      {error ? <ErrorState error={error} onRetry={reload} title={error.status === 404 ? 'Invitation not found' : 'Invitation could not be loaded'} className="py-8" />
        : !ready || loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading invitation">
            <Skeleton className="h-6 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={inv.status} />
              <RoleBadge role={inv.role} />
              <span className="text-[13px] text-muted">{lifecycleText(inv)}</span>
            </div>

            {a.revealed && a.revealed.id === inv.id ? <InvitationLink invitation={a.revealed} compact /> : (
              <div className="rounded-xl border border-line bg-subtle/50 p-4">
                <p className="text-[12px] font-medium uppercase tracking-wide text-faint">Invitation token</p>
                <p className="mt-0.5 font-mono text-[15px] font-semibold tracking-wider text-ink">…{inv.codeHint || '????'}</p>
                <p className="mt-1.5 text-[12.5px] text-muted">Only the last 4 characters are stored for reference. {a.canResend(inv) ? 'Resend to generate a new link you can copy and share.' : 'The link can no longer be used.'}</p>
              </div>
            )}

            <DescriptionList columns={2} items={[
              ['Recipient', inv.email],
              ['Invited by', inv.invitedByName],
              ['Created', formatDateTime(inv.createdAt)],
              ['Expires', formatDateTime(inv.expiresAt)],
              inv.acceptedAt && ['Accepted', formatDateTime(inv.acceptedAt)],
              inv.revokedAt && ['Revoked', formatDateTime(inv.revokedAt)],
              ['Last sent', formatDateTime(inv.lastSentAt)],
              ['Resent', inv.resendCount ? pluralize(inv.resendCount, 'time') : 'Never'],
              ['Delivery', 'Manual — no email is sent'],
              inv.userId && ['User record', <Link key="u" to={`/admin/users/${inv.userId}`} className="link" onClick={onClose}>View user</Link>]
            ]} />

            <div className="grid gap-4 sm:grid-cols-2">
              <TextBlock label="Personal message" value={inv.message} empty="No personal message." />
              <TextBlock label="Internal note" value={inv.note} empty="No internal note." />
            </div>

            <Notice title="No email is sent">Share the invitation link with the recipient yourself. The link is shown only when the invitation is created or resent.</Notice>
          </div>
        )}
    </Modal>
  );
}

function TextBlock({ label, value, empty }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-medium uppercase tracking-wide text-faint">{label}</p>
      {value ? <p className="mt-1 whitespace-pre-wrap break-words text-[13.5px] text-ink">{value}</p> : <p className="mt-1 text-[13.5px] text-muted">{empty}</p>}
    </div>
  );
}
