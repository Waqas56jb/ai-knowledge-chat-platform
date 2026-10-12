import { Mail } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { InfoBadge } from '../common/StatusBadge';
import { ROLE_INFO } from '../users/roles';
import { roleLabel } from '../../constants/domain';

/** Preview of the invitation email the recipient will receive. */
export default function InvitationPreview({ email, role, expiryLabel, message, inviterName, workspaceName }) {
  const recipient = email?.trim() || 'recipient@company.com';
  return (
    <Card>
      <CardHeader title="Invitation preview" icon={Mail} description="Updates as you type." actions={<InfoBadge>Not emailed</InfoBadge>} />
      <div className="card-pad">
        <dl className="space-y-1 border-b border-line pb-3 text-[12.5px]">
          <div className="flex gap-2"><dt className="w-14 shrink-0 text-faint">To</dt><dd className="min-w-0 truncate text-ink">{recipient}</dd></div>
          <div className="flex gap-2"><dt className="w-14 shrink-0 text-faint">Subject</dt><dd className="min-w-0 text-ink">You&apos;re invited to join {workspaceName}</dd></div>
        </dl>
        <div className="mt-4 rounded-xl border border-line bg-bg p-4 text-[13.5px] leading-relaxed">
          <p className="font-display text-[16px] font-semibold text-ink">Join {workspaceName}</p>
          <p className="mt-2 text-muted"><b className="font-semibold text-ink">{inviterName}</b> invited you to the workspace as <b className="font-semibold text-ink">{roleLabel(role || 'member')}</b>.</p>
          {ROLE_INFO[role] && <p className="mt-1 text-[12.5px] text-faint">{ROLE_INFO[role].description}</p>}
          {message?.trim() && (
            <blockquote className="mt-3 whitespace-pre-wrap break-words border-l-2 border-primary/60 pl-3 text-ink">{message.trim()}</blockquote>
          )}
          <span className="mt-4 inline-flex cursor-default select-none items-center rounded-lg bg-primary-strong px-3.5 py-2 text-[13px] font-semibold text-primary-fg" aria-hidden="true">Accept invitation</span>
          <p className="mt-3 text-[12px] text-faint">
            The secure link is generated when you create the invitation. It expires in {expiryLabel || '7 days'}.
          </p>
        </div>
        <p className="mt-3 text-[12px] text-faint">This is emailed to the recipient when you create the invitation.</p>
      </div>
    </Card>
  );
}
