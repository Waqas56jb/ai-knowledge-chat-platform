import { useState } from 'react';
import { Ban, Download, RotateCcw, Trash2, UserX, X } from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import { useConfirm } from '../common/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { bulkSetStatus, deleteUsers } from '../../services/userService';
import { pluralize } from '../../utils/format';
import { isProtectedUser } from './roles';

const ACTIONS = {
  suspend: { status: 'suspended', eligible: u => u.status === 'active' || u.status === 'pending', verb: 'Suspend', done: 'suspended', danger: true },
  reactivate: { status: 'active', eligible: u => u.status === 'suspended' || u.status === 'revoked', verb: 'Reactivate', done: 'reactivated' },
  revoke: { status: 'revoked', eligible: u => u.status !== 'revoked', verb: 'Revoke access for', done: 'revoked', danger: true }
};

/** Sticky bar shown when users are selected. `users` = the selected user objects. */
export default function BulkActionsBar({ users, onClear, onExport }) {
  const confirm = useConfirm();
  const { session } = useAuth();
  const [busy, setBusy] = useState(null);
  const count = users.length;
  const self = users.filter(u => isProtectedUser(u, session));
  const skippedNote = self.length ? ' Your own account was skipped.' : '';

  /** Report per-user results of a bulk loop over the per-user endpoints. */
  const report = (res, done, verb) => {
    if (res.done.length) toast.success(`${pluralize(res.done.length, 'user')} ${done}.`, skippedNote ? { description: skippedNote.trim() } : undefined);
    if (res.failed.length) {
      const name = id => (users.find(u => u.id === id) || {}).name || id;
      toast.error(`${pluralize(res.failed.length, 'user')} could not be ${verb}.`, { description: res.failed.slice(0, 3).map(f => `${name(f.id)}: ${f.error.message}`).join(' · ') });
    }
  };

  const setStatus = async key => {
    const a = ACTIONS[key];
    const targets = users.filter(u => a.eligible(u) && (key === 'reactivate' || !isProtectedUser(u, session)));
    if (!targets.length) { toast.info(`No selected users can be ${a.done}.`, { description: 'They already have that status or are protected.' }); return; }
    if (a.danger && !(await confirm({ title: `${a.verb} ${pluralize(targets.length, 'user')}?`, message: `${targets.length === count ? 'All selected users' : `${targets.length} of ${count} selected users`} will be ${a.done}.${skippedNote}`, confirmLabel: `${a.verb.split(' ')[0]} ${pluralize(targets.length, 'user')}`, danger: true }))) return;
    setBusy(key);
    try {
      const res = await bulkSetStatus(targets.map(u => u.id), a.status);
      report(res, a.done, a.done);
      onClear();
    } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };

  const remove = async () => {
    const targets = users.filter(u => !isProtectedUser(u, session));
    if (!targets.length) { toast.info('You cannot delete your own account.'); return; }
    if (!(await confirm({ title: `Delete ${pluralize(targets.length, 'user')}?`, message: `This permanently deletes ${pluralize(targets.length, 'account')} and their conversations. This cannot be undone.${skippedNote}`, confirmLabel: `Delete ${pluralize(targets.length, 'user')}`, danger: true }))) return;
    setBusy('delete');
    try {
      const res = await deleteUsers(targets.map(u => u.id));
      report(res, 'deleted', 'deleted');
      onClear();
    } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };

  if (!count) return null;
  return (
    <div role="region" aria-label="Bulk actions" className="flex flex-col gap-3 border-b border-line bg-primary-soft/40 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
      <p className="text-[13.5px] font-medium text-ink" aria-live="polite">{pluralize(count, 'user')} selected</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" icon={Ban} onClick={() => setStatus('suspend')} loading={busy === 'suspend'} disabled={!!busy}>Suspend</Button>
        <Button size="sm" icon={RotateCcw} onClick={() => setStatus('reactivate')} loading={busy === 'reactivate'} disabled={!!busy}>Reactivate</Button>
        <Button size="sm" icon={UserX} onClick={() => setStatus('revoke')} loading={busy === 'revoke'} disabled={!!busy}>Revoke</Button>
        <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={remove} loading={busy === 'delete'} disabled={!!busy}>Delete</Button>
        <Button size="sm" icon={Download} onClick={onExport} disabled={!!busy}>Export selected</Button>
        <Button size="sm" variant="ghost" icon={X} onClick={onClear} disabled={!!busy}>Clear</Button>
      </div>
    </div>
  );
}
