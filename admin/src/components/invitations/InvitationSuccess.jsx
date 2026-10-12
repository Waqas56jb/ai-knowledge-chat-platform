import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, List, MailPlus } from 'lucide-react';
import { Card } from '../common/Card';
import Button from '../common/Button';
import StatusBadge from '../common/StatusBadge';
import { CopyButton } from '../common/Misc';
import { formatDateTime } from '../../utils/format';
import { RoleBadge } from '../users/roles';

/**
 * The invitation link and token returned by POST /admin/invitations (or /resend). The server stores
 * only a hash, so this is the only time they can be shown.
 */
export function InvitationLink({ invitation, compact = false }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-subtle/50 p-4">
        <p className="text-[12px] font-medium uppercase tracking-wide text-faint">Invitation link</p>
        <p className="mt-1 break-all text-[13px] text-ink">{invitation.url}</p>
        <p className="mt-3 text-[12px] font-medium uppercase tracking-wide text-faint">Invitation token</p>
        <p className={compact ? 'mt-1 break-all font-mono text-[14px] font-semibold tracking-wide text-ink' : 'mt-1 break-all font-mono text-[16px] font-semibold tracking-wide text-ink'}>{invitation.token}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <CopyButton text={invitation.url} label="Copy link" successMessage="Invitation link copied." variant="primary" size="md" />
          <CopyButton text={invitation.token} label="Copy token" successMessage="Invitation token copied." size="md" />
        </div>
      </div>
      <div role="alert" className="flex gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[13px]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <p className="text-ink"><b className="font-semibold">Copy it now — it won&apos;t be shown again.</b> <span className="text-muted">Only a hash of the token is stored. No email is sent: share this link with the recipient yourself. If it is lost, resend the invitation to generate a new link.</span></p>
      </div>
    </div>
  );
}

/** Shown after an invitation is created: the one-time link and token plus next steps. */
export default function InvitationSuccess({ invitation, onCreateAnother }) {
  return (
    <Card className="overflow-hidden" aria-live="polite">
      <div className="flex flex-col items-center border-b border-line bg-success-soft/40 px-6 py-8 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success"><CheckCircle2 className="h-6 w-6" aria-hidden="true" /></span>
        <h2 className="mt-3 text-[19px] font-semibold">Invitation created</h2>
        <p className="mt-1 max-w-md text-[13.5px] text-muted">
          Share the link below with <b className="font-semibold text-ink">{invitation.email}</b>. No email was sent.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2"><StatusBadge status={invitation.status} /><RoleBadge role={invitation.role} /></div>
      </div>

      <div className="card-pad space-y-4">
        <InvitationLink invitation={invitation} />
        <p className="text-[13px] text-muted">Expires {formatDateTime(invitation.expiresAt)}.</p>
        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Button icon={MailPlus} onClick={onCreateAnother}>Create another</Button>
          <Button as={Link} to={`/admin/invitations?focus=${invitation.id}`} icon={List}>View invitations</Button>
        </div>
      </div>
    </Card>
  );
}
