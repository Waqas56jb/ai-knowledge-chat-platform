import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CircleDot, CalendarClock, Ban, Plus, Save, MessagesSquare, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import Drawer from '../processing/Drawer';
import Button from '../common/Button';
import { DescriptionList } from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { ErrorState, Skeleton } from '../common/States';
import { FormField, Textarea } from '../forms/FormField';
import { useQuery } from '../../hooks/useQuery';
import { getContentGapById, updateContentGap, GAP_STATUS_LABELS } from '../../services/contentGapService';
import { cn } from '../../utils/cn';
import { formatDateTime, formatNumber, relativeTime } from '../../utils/format';
import { GapIndicators } from './gapUtils';

const NOTE_MAX = 2000;
const STATUS_ACTIONS = [
  { value: 'open', icon: CircleDot, hint: 'Still needs content.' },
  { value: 'planned', icon: CalendarClock, hint: 'Content is being prepared.' },
  { value: 'covered', icon: CheckCircle2, hint: 'New content answers it.' },
  { value: 'dismissed', icon: Ban, hint: 'Out of scope or not worth covering.' }
];

/** Detail of one unanswered question: counts, triage status, note and every time it was asked. */
export default function GapDrawer({ gapId, onClose }) {
  const { data: gap, loading, error, reload } = useQuery(() => (gapId ? getContentGapById(gapId) : Promise.resolve(null)), [gapId]);
  const shown = gap && gap.id === gapId ? gap : null;
  return (
    <Drawer open={!!gapId} onClose={onClose} title="Unanswered question"
      subtitle={shown && <span className="flex flex-wrap items-center gap-2"><StatusBadge status={shown.status} label={GAP_STATUS_LABELS[shown.status]} /><GapIndicators gap={shown} /></span>}
      footer={shown && <>
        <Button as={Link} to="/admin/knowledge/add" icon={Plus} onClick={onClose}>Add content</Button>
        <Button variant="primary" onClick={onClose}>Done</Button>
      </>}>
      {error ? <ErrorState error={error} title={error.status === 404 ? 'Question not found' : 'Question could not be loaded'} onRetry={reload} />
        : loading || !shown ? <DrawerSkeleton /> : <GapBody gap={shown} />}
    </Drawer>
  );
}

function GapBody({ gap }) {
  const [pending, setPending] = useState(null);
  const [note, setNote] = useState(gap.note);
  const [savingNote, setSavingNote] = useState(false);
  useEffect(() => { setNote(gap.note); }, [gap.id, gap.note]);
  const noteDirty = note.trim() !== (gap.note || '').trim();
  const tooLong = note.length > NOTE_MAX;

  const setStatus = async status => {
    setPending(status);
    try { await updateContentGap(gap.id, { status }); toast.success(`Marked as ${GAP_STATUS_LABELS[status].toLowerCase()}.`); }
    catch (err) { toast.error(err.message); } finally { setPending(null); }
  };
  const saveNote = async () => {
    if (tooLong) return;
    setSavingNote(true);
    try { await updateContentGap(gap.id, { note: note.trim() }); toast.success(note.trim() ? 'Note saved.' : 'Note cleared.'); }
    catch (err) { toast.error(err.message); } finally { setSavingNote(false); }
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="text-[12px] font-medium uppercase tracking-wide text-faint">Question</p>
        <p className="mt-1 whitespace-pre-line break-words font-display text-[17px] font-semibold leading-snug text-ink">{gap.question}</p>
      </section>

      {gap.askedAgainAfterCovered && (
        <div role="alert" className="flex gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[13px]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-ink"><b className="font-semibold">Asked again after it was marked covered.</b> <span className="text-muted">Users still get no answer; the new content may not cover it yet.</span></p>
        </div>
      )}
      {gap.answeredSince && (
        <div role="note" className="flex gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-[13px]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          <p className="text-ink"><b className="font-semibold">Answered since.</b> <span className="text-muted">The same question was answered after it last failed — new content probably covers it now.</span></p>
        </div>
      )}

      <DescriptionList columns={2} items={[
        ['Times asked', formatNumber(gap.askCount)],
        ['Users', formatNumber(gap.userCount)],
        ['First asked', <span key="f" title={formatDateTime(gap.firstAskedAt)}>{formatDateTime(gap.firstAskedAt)}</span>],
        ['Last asked', <span key="l" title={formatDateTime(gap.lastAskedAt)}>{relativeTime(gap.lastAskedAt)}</span>],
        ['Last answered', gap.lastAnsweredAt ? <span key="a" title={formatDateTime(gap.lastAnsweredAt)}>{relativeTime(gap.lastAnsweredAt)}</span> : 'Never'],
        ['Triaged', gap.triagedAt ? `${gap.updatedByName || 'An administrator'} · ${relativeTime(gap.triagedAt)}` : 'Not yet']
      ]} />

      <section>
        <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-faint">Status</h3>
        <div role="radiogroup" aria-label="Status" className="grid gap-2 sm:grid-cols-2">
          {STATUS_ACTIONS.map(o => {
            const selected = gap.status === o.value;
            return (
              <button key={o.value} type="button" role="radio" aria-checked={selected} disabled={!!pending}
                onClick={() => { if (!selected) setStatus(o.value); }}
                className={cn('flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-wait',
                  selected ? 'border-primary bg-primary-soft/60' : 'border-line hover:border-primary/40 hover:bg-subtle')}>
                <o.icon className={cn('mt-0.5 h-4 w-4 shrink-0', pending === o.value && 'animate-pulse', selected ? 'text-primary-text' : 'text-muted')} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium text-ink">{GAP_STATUS_LABELS[o.value]}</span>
                  <span className="block text-[12px] text-muted">{o.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <FormField label="Note" optional error={tooLong ? `Notes must be ${NOTE_MAX} characters or fewer.` : undefined} help={`${note.length}/${NOTE_MAX} · e.g. which video will cover it. Visible to administrators.`}>
          <Textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Plan for this question, e.g. “Covered in the March pricing video”." />
        </FormField>
        <div className="mt-2 flex justify-end gap-2">
          {noteDirty && <Button size="sm" onClick={() => setNote(gap.note)} disabled={savingNote}>Cancel</Button>}
          <Button size="sm" variant="secondary" icon={Save} loading={savingNote} disabled={!noteDirty || tooLong} onClick={saveNote}>Save note</Button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-faint"><MessagesSquare className="h-3.5 w-3.5" aria-hidden="true" />Times asked ({gap.occurrences.length})</h3>
        {gap.occurrences.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {gap.occurrences.map(o => (
              <li key={o.messageId} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-ink" title={o.question}>{o.question}</span>
                  <span className="block text-[12px] text-muted">{o.userName || 'Deleted user'} · <time dateTime={o.askedAt} title={formatDateTime(o.askedAt)}>{relativeTime(o.askedAt)}</time></span>
                </span>
                <span className="flex items-center gap-2">
                  {o.answered ? <StatusBadge status="answered" label="Answered" /> : <StatusBadge status="insufficient_evidence" label="Not answered" />}
                  {o.conversationId && <Link to={`/admin/conversations/${o.conversationId}`} className="link inline-flex items-center gap-1 text-[12.5px]">Conversation<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-xl border border-dashed border-line p-3 text-[13px] text-muted">No conversations with this question remain.</p>}
      </section>
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading question">
      <Skeleton className="h-6 w-3/4" />
      <div className="grid grid-cols-2 gap-4">{[0, 1, 2, 3].map(i => <div key={i} className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="w-28" /></div>)}</div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
