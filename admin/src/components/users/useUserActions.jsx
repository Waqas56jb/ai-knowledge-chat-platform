import { useState } from 'react';
import { Ban, Eye, PencilLine, RotateCcw, ShieldCheck, Trash2, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '../common/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { deleteUser, reactivateUser, revokeAccess, suspendUser } from '../../services/userService';
import EditUserModal from './EditUserModal';
import ChangeRoleModal from './ChangeRoleModal';
import { isProtectedUser } from './roles';

/**
 * Single-user actions shared by the users list and the user detail page.
 *   const actions = useUserActions({ onDeleted });
 *   <DropdownMenu items={actions.menuItems(user)} />   {actions.modals}
 */
export function useUserActions({ onDeleted } = {}) {
  const confirm = useConfirm();
  const { session } = useAuth();
  const [editing, setEditing] = useState(null);
  const [roleFor, setRoleFor] = useState(null);
  const [busy, setBusy] = useState(null);

  const isProtected = u => isProtectedUser(u, session);

  const run = async (key, fn, success) => {
    setBusy(key);
    try { await fn(); toast.success(success.title, success.description ? { description: success.description } : undefined); return true; } catch (err) { toast.error(err.message); return false; } finally { setBusy(null); }
  };

  const suspend = async u => {
    if (!(await confirm({ title: `Suspend ${u.name}?`, message: 'They will be signed out and unable to use the workspace until reactivated. Their conversations and history are kept.', confirmLabel: 'Suspend user', danger: true }))) return;
    await run(`suspend-${u.id}`, () => suspendUser(u.id), { title: `${u.name} was suspended.`, description: 'Their sessions stop working on the next request.' });
  };
  const reactivate = u => run(`reactivate-${u.id}`, () => reactivateUser(u.id), { title: `${u.name} was reactivated.` });
  const revoke = async u => {
    if (!(await confirm({ title: `Revoke access for ${u.name}?`, message: 'Their workspace access is removed. To restore it later, reactivate the user or send a new invitation.', confirmLabel: 'Revoke access', danger: true }))) return;
    await run(`revoke-${u.id}`, () => revokeAccess(u.id), { title: `Access revoked for ${u.name}.` });
  };
  const remove = async u => {
    if (!(await confirm({ title: `Delete ${u.name}?`, message: <>This permanently deletes the account <b className="text-ink">{u.email}</b> and their conversations. This cannot be undone.</>, confirmLabel: 'Delete user', danger: true }))) return;
    const ok = await run(`delete-${u.id}`, () => deleteUser(u.id), { title: `${u.name} was deleted.` });
    if (ok && onDeleted) onDeleted(u);
  };

  /** Dropdown items. `includeView` adds "View details" (list page). */
  const menuItems = (u, { includeView = true, includeEdit = true, includeRole = true, includeStatus = true } = {}) => {
    const locked = isProtected(u);
    const hint = locked ? 'You' : undefined;
    const canSuspend = u.status === 'active' || u.status === 'pending';
    return [
      includeView && { label: 'View details', icon: Eye, to: `/admin/users/${u.id}` },
      includeEdit && { label: 'Edit profile', icon: PencilLine, onClick: () => setEditing(u) },
      includeRole && { label: 'Change role', icon: ShieldCheck, onClick: () => setRoleFor(u), disabled: locked, hint },
      (includeView || includeEdit || includeRole) && { divider: true },
      includeStatus && (canSuspend
        ? { label: 'Suspend user', icon: Ban, onClick: () => suspend(u), disabled: locked, hint }
        : { label: 'Reactivate user', icon: RotateCcw, onClick: () => reactivate(u) }),
      u.status !== 'revoked' && { label: 'Revoke access', icon: UserX, onClick: () => revoke(u), danger: !locked, disabled: locked, hint },
      { divider: true },
      { label: 'Delete user', icon: Trash2, onClick: () => remove(u), danger: !locked, disabled: locked, hint }
    ].filter(Boolean).filter((it, i, arr) => !it.divider || (i > 0 && i < arr.length - 1 && !arr[i - 1].divider));
  };

  const modals = (
    <>
      <EditUserModal user={editing} open={!!editing} onClose={() => setEditing(null)} protectedUser={isProtected(editing)} />
      <ChangeRoleModal user={roleFor} open={!!roleFor} onClose={() => setRoleFor(null)} />
    </>
  );

  return { menuItems, modals, edit: setEditing, changeRole: setRoleFor, suspend, reactivate, revoke, remove, busy, isProtected };
}
