import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Notice } from '../common/Misc';
import { roleLabel } from '../../constants/domain';
import { changeRole } from '../../services/userService';
import { RoleOptions } from './roles';

/** Small dialog for changing a user's role (PATCH /admin/users/:id { role }). */
export default function ChangeRoleModal({ user, open, onClose }) {
  const [role, setRole] = useState(user?.role);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setRole(user?.role); }, [open, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    try {
      await changeRole(user.id, role);
      toast.success(`${user.name} is now ${role === 'admin' ? 'an' : 'a'} ${roleLabel(role)}.`, { description: 'The new permissions apply from their next request.' });
      onClose();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Change role" description={user ? `Choose a role for ${user.name}.` : undefined} size="md" dismissible={!saving}
      footer={<>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" icon={ShieldCheck} onClick={save} loading={saving} disabled={!user || role === user.role}>Update role</Button>
      </>}>
      <div className="space-y-4">
        <RoleOptions name="change-role" value={role} onChange={setRole} compact />
        <Notice title="Server enforced">Role changes are enforced by the API and recorded in the audit log. You cannot change your own role or demote the last active administrator.</Notice>
      </div>
    </Modal>
  );
}
