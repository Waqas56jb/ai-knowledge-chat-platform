import { useEffect, useState } from 'react';
import { Pencil, Save, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader } from '../../common/Card';
import Button from '../../common/Button';
import { FormField, Textarea } from '../../forms/FormField';
import { updateSource } from '../../../services/knowledgeService';

const MAX = 2000;

/** Administrative notes with inline editing. */
export default function SourceNotes({ source }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(source.notes || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!editing) setValue(source.notes || ''); }, [source.notes, editing]);

  const save = async () => {
    if (value.length > MAX) return;
    setSaving(true);
    try { await updateSource(source.id, { notes: value.trim() }); toast.success('Notes saved.'); setEditing(false); }
    catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };
  const over = value.length > MAX;

  return (
    <Card>
      <CardHeader title="Administrative notes" icon={StickyNote} description="Visible to administrators only."
        actions={!editing && <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>{source.notes ? 'Edit notes' : 'Add notes'}</Button>} />
      <div className="card-pad">
        {editing ? (
          <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-3">
            <FormField label="Notes" labelHidden error={over ? `Notes must be ${MAX} characters or fewer.` : undefined} help={`${value.length}/${MAX} characters`}>
              <Textarea rows={6} value={value} onChange={e => setValue(e.target.value)} autoFocus placeholder="Why this source exists, who to ask about it, when to review it…"
                onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setEditing(false); } if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }} />
            </FormField>
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" icon={Save} loading={saving} disabled={over}>Save notes</Button>
            </div>
          </form>
        ) : source.notes
          ? <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">{source.notes}</p>
          : <p className="text-[13.5px] text-muted">No notes yet. Add context for other administrators, such as why the source was added or when it should be reviewed.</p>}
      </div>
    </Card>
  );
}
