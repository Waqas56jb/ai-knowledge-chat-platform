import { useState } from 'react';
import { Eye, MailX, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '../common/ConfirmDialog';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { resendInvitation, revokeInvitation } from '../../services/invitationService';
import { InvitationLink } from './InvitationSuccess';

/**
 * Invitation actions shared by the table and the detail modal. Illegal actions are omitted per status.
 * Resend rotates the token, so the new link is shown once (`revealed` / `modals`).
 *   const a = useInvitationActions({ onView });  a.menuItems(inv)  {a.modals}
 */
export function useInvitationActions({ onView } = {}) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(null);
  const [revealed, setRevealed] = useState(null);

  const resend = async inv => {
    const ok = await confirm({
      title: inv.status === 'expired' ? 'Renew this invitation?' : 'Resend this invitation?',
      message: <>A new link is generated for <b className="text-ink">{inv.email}</b> and the previous link stops working. No email is sent: you will copy the new link and share it.</>,
      confirmLabel: inv.status === 'expired' ? 'Renew and get link' : 'Resend and get link'
    });
    if (!ok) return null;
    setBusy(`resend-${inv.id}`);
    try {
      const fresh = await resendInvitation(inv.id);
      setRevealed(fresh);
      toast.success(inv.status === 'expired' ? 'Invitation renewed.' : 'Invitation resent.', { description: 'Copy the new link — it is shown only once.' });
      return fresh;
    } catch (err) { toast.error(err.message); return null; } finally { setBusy(null); }
  };

  const revoke = async inv => {
    if (!(await confirm({ title: 'Revoke invitation?', message: <>The invitation link for <b className="text-ink">{inv.email}</b> will stop working. You can send a new invitation later.</>, confirmLabel: 'Revoke invitation', danger: true }))) return false;
    setBusy(`revoke-${inv.id}`);
    try { await revokeInvitation(inv.id); toast.success('Invitation revoked.', { description: inv.email }); return true; } catch (err) { toast.error(err.message); return false; } finally { setBusy(null); }
  };

  const canResend = inv => inv.status === 'pending' || inv.status === 'expired';
  const isPending = inv => inv.status === 'pending';
  const canRevoke = inv => inv.status === 'pending' || inv.status === 'expired';

  const menuItems = inv => [
    onView && { label: 'View details', icon: Eye, onClick: () => onView(inv) },
    (canResend(inv) || canRevoke(inv)) && onView && { divider: true },
    canResend(inv) && { label: inv.status === 'expired' ? 'Renew and get new link' : 'Resend (new link)', icon: Send, onClick: () => resend(inv) },
    canRevoke(inv) && { divider: true },
    canRevoke(inv) && { label: 'Revoke invitation', icon: MailX, onClick: () => revoke(inv), danger: true }
  ].filter(Boolean).filter((it, i, arr) => !it.divider || (i > 0 && i < arr.length - 1 && !arr[i - 1].divider));

  const modals = (
    <Modal open={!!revealed} onClose={() => setRevealed(null)} title="New invitation link" description={revealed ? revealed.email : undefined} size="md"
      footer={<Button variant="primary" onClick={() => setRevealed(null)}>Done</Button>}>
      {revealed && <InvitationLink invitation={revealed} compact />}
    </Modal>
  );

  return { menuItems, resend, revoke, canResend, canRevoke, isPending, busy, revealed, clearRevealed: () => setRevealed(null), modals };
}
