import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, MessageSquarePlus, NotebookPen } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatDateTime, relativeTime } from '../../utils/format';
import { addReviewNote } from '../../services/conversationService';
import { Card, CardHeader } from '../common/Card';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import StatusBadge from '../common/StatusBadge';
import { FormField, Textarea } from '../forms/FormField';
import { REVIEW_OPTIONS, useReviewStatus } from './reviewOptions';

const MAX = 1000;
const noteSchema = z.object({
  text: z.string().trim().min(1, 'Write a note before saving.').max(MAX, `Notes must be ${MAX} characters or fewer.`)
});

/** Review tab: current decision, decision picker, review-note history and the add-note form. */
export default function ConversationReview({ conversation }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <ReviewDecision conversation={conversation} />
      <div className="space-y-6">
        <AddNoteForm conversationId={conversation.id} />
        <NotesHistory notes={conversation.reviewNotes} />
      </div>
    </div>
  );
}

function ReviewDecision({ conversation }) {
  const [change, pending] = useReviewStatus(conversation.id);
  const current = conversation.reviewStatus;
  return (
    <Card className="self-start">
      <CardHeader title="Review decision" description="Recorded in the audit log when changed." actions={<StatusBadge status={current} />} />
      <div role="radiogroup" aria-label="Review status" className="space-y-2 p-4">
        {REVIEW_OPTIONS.map(o => {
          const selected = o.value === current;
          const Icon = o.icon;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={selected} disabled={!!pending}
              onClick={() => { if (!selected) change(o.value); }}
              className={cn('flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition disabled:cursor-wait',
                selected ? 'border-primary bg-primary-soft/60' : 'border-line hover:border-primary/40 hover:bg-subtle')}>
              <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg', selected ? 'bg-surface text-primary-text' : 'bg-subtle text-muted')}>
                {pending === o.value ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-ink">{o.label}</span>
                <span className="block text-[12.5px] text-muted">{o.hint}</span>
              </span>
              <span className={cn('mt-1.5 h-4 w-4 shrink-0 rounded-full border-2', selected ? 'border-primary-strong bg-primary-strong shadow-[inset_0_0_0_3px_rgb(var(--surface))]' : 'border-line')} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function AddNoteForm({ conversationId }) {
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(noteSchema), defaultValues: { text: '' } });
  const length = (watch('text') || '').length;
  const onSubmit = async ({ text }) => {
    try {
      await addReviewNote(conversationId, text);
      reset({ text: '' });
      toast.success('Review note added.', { description: 'Visible to administrators and recorded in the audit log.' });
    } catch (err) { toast.error(err.message); }
  };
  return (
    <Card>
      <CardHeader icon={NotebookPen} title="Add a review note" description="Internal to administrators. Do not paste personal data." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 p-5">
        <FormField label="Note" error={errors.text?.message} help="Explain the decision so other reviewers can follow it." required>
          <Textarea rows={4} maxLength={MAX + 200} placeholder="e.g. Citation [2] quotes an outdated policy; flagged for the knowledge owner." {...register('text')} />
        </FormField>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={cn('text-[12px] tabular-nums', length > MAX ? 'font-semibold text-danger' : 'text-faint')} aria-live="polite">{length} / {MAX}</span>
          <Button type="submit" variant="secondary" icon={MessageSquarePlus} loading={isSubmitting}>Add note</Button>
        </div>
      </form>
    </Card>
  );
}

function NotesHistory({ notes }) {
  const sorted = [...notes].sort((a, b) => new Date(b.at) - new Date(a.at));
  return (
    <Card>
      <CardHeader title="Review history" description={notes.length ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}, newest first.` : undefined} />
      {sorted.length === 0 ? (
        <p className="px-5 py-6 text-[13.5px] text-muted">No review notes yet. Add the first one above.</p>
      ) : (
        <ol className="divide-y divide-line">
          {sorted.map(n => (
            <li key={n.id} className="flex gap-3 px-5 py-4">
              <Avatar name={n.authorName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-[13px]">
                  <span className="font-semibold text-ink">{n.authorName}</span>
                  <time dateTime={n.at} title={formatDateTime(n.at)} className="text-[12px] text-faint">{relativeTime(n.at)}</time>
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-[13.5px] text-ink">{n.text}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
