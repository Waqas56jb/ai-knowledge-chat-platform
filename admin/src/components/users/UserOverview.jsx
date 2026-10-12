import { useEffect, useState } from 'react';
import { NotebookPen, PencilLine, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, DescriptionList } from '../common/Card';
import Button from '../common/Button';
import StatusBadge from '../common/StatusBadge';
import { FormField, Textarea } from '../forms/FormField';
import { updateUser } from '../../services/userService';
import { formatDate, formatDateTime, formatNumber, pluralize, relativeTime } from '../../utils/format';
import { RoleBadge } from './roles';

const MAX_NOTES = 2000;

export function sourceAccessSummary(user) {
  const n = user.accessibleSources.length;
  return user.sourceAccess === 'restricted' ? `Restricted to ${pluralize(n, 'selected source')}` : `All workspace sources (${pluralize(n, 'source')})`;
}

/** Overview tab: profile facts + editable administrative notes. */
export default function UserOverview({ user, onShowAccess }) {
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader title="Profile" icon={UserRound} description="Account details for this user." />
        <div className="card-pad">
          <DescriptionList columns={2} items={[
            ['Role', <RoleBadge key="r" role={user.role} />],
            ['Status', <StatusBadge key="s" status={user.status} />],
            ['Department', user.department || '—'],
            ['Email', user.email],
            ['Joined', <time key="j" dateTime={user.createdAt} title={formatDateTime(user.createdAt)}>{formatDate(user.createdAt)}</time>],
            ['Last active', user.lastActiveAt ? <time key="l" dateTime={user.lastActiveAt} title={formatDateTime(user.lastActiveAt)}>{relativeTime(user.lastActiveAt)}</time> : 'Never'],
            ['Conversations', formatNumber(user.conversationCount)],
            ['Questions asked', formatNumber(user.questionsAsked)],
            ['Knowledge access', <button key="a" type="button" className="link text-left" onClick={onShowAccess}>{sourceAccessSummary(user)}</button>]
          ]} />
        </div>
      </Card>
      <NotesCard user={user} />
    </div>
  );
}

function NotesCard({ user }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.notes || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!editing) setValue(user.notes || ''); }, [user.notes, editing]);

  const tooLong = value.length > MAX_NOTES;
  const save = async () => {
    if (tooLong) return;
    setSaving(true);
    try {
      await updateUser(user.id, { notes: value.trim() });
      toast.success('Notes saved.');
      setEditing(false);
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Administrative notes" icon={NotebookPen} description="Only visible to administrators."
        actions={!editing && <Button size="sm" variant="ghost" icon={PencilLine} onClick={() => setEditing(true)}>{user.notes ? 'Edit' : 'Add note'}</Button>} />
      <div className="card-pad">
        {editing ? (
          <div className="space-y-3">
            <FormField label="Notes" labelHidden error={tooLong ? `Notes must be ${MAX_NOTES} characters or fewer.` : undefined} help={`${value.length}/${MAX_NOTES}`}>
              <Textarea rows={6} value={value} onChange={e => setValue(e.target.value)} placeholder="Context for other administrators, e.g. why access was restricted." autoFocus />
            </FormField>
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" onClick={() => { setEditing(false); setValue(user.notes || ''); }} disabled={saving}>Cancel</Button>
              <Button size="sm" variant="primary" icon={Save} onClick={save} loading={saving} disabled={tooLong || value.trim() === (user.notes || '').trim()}>Save notes</Button>
            </div>
          </div>
        ) : user.notes
          ? <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{user.notes}</p>
          : <p className="text-[13.5px] text-muted">No notes yet. Add context such as why access was changed or who to contact.</p>}
      </div>
    </Card>
  );
}
