import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, FileText, X, CheckCircle2, Loader2, CircleAlert, Clock } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { formatBytes } from '../../../utils/format';
import Button from '../../common/Button';
import { FILE_TYPES, fileExt } from '../sourceUtils';
import { MAX_CONVERSATION_FILES, conversationFileError } from './wizardModel';

const ACCEPT = '.pdf,.docx,.txt,.md,.markdown';
const key = f => `${f.name}:${f.size}:${f.lastModified}`;

/**
 * Multi-file picker for client conversation logs (PDF, DOCX, TXT, MD; e.g. a WhatsApp chat export .txt).
 * Each file is uploaded on its own with asConversation=true when the source is added.
 */
export default function ConversationFiles({ files, onChange, error, maxFileSizeMb, disabled }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [localError, setLocalError] = useState('');

  const pick = list => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    const next = [...files];
    const problems = [];
    for (const f of incoming) {
      const bad = conversationFileError(f, maxFileSizeMb);
      if (bad) { problems.push(bad); continue; }
      if (next.some(x => key(x) === key(f))) continue;
      if (next.length >= MAX_CONVERSATION_FILES) { problems.push(`You can upload up to ${MAX_CONVERSATION_FILES} files at a time.`); break; }
      next.push(f);
    }
    setLocalError(problems.join(' '));
    onChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  const open = () => !disabled && inputRef.current && inputRef.current.click();
  const remove = f => { onChange(files.filter(x => key(x) !== key(f))); setLocalError(''); };
  const shownError = localError || error;
  const total = files.reduce((n, f) => n + f.size, 0);

  return (
    <div>
      <span className="label" id="conv-files-label">Conversation files<span className="ml-0.5 text-danger" aria-hidden="true">*</span></span>
      <input ref={inputRef} type="file" multiple accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={e => pick(e.target.files)} />

      <div role="button" tabIndex={disabled ? -1 : 0} aria-labelledby="conv-files-label" aria-describedby="conv-files-help" aria-disabled={disabled || undefined}
        onClick={open} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); if (!disabled) pick(e.dataTransfer.files); }}
        className={cn('flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center outline-none transition focus-visible:ring-4 focus-visible:ring-primary/20',
          files.length ? 'py-6' : 'py-10',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          drag ? 'border-primary bg-primary-soft/60' : shownError ? 'border-danger/50 bg-danger-soft/30' : 'border-line bg-subtle/40 hover:border-primary/50 hover:bg-primary-soft/30')}>
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface text-primary-text shadow-card"><UploadCloud className="h-5 w-5" aria-hidden="true" /></span>
        <p className="text-[14px] font-semibold text-ink">{drag ? 'Drop the files to add them' : files.length ? 'Add more files' : 'Drag and drop conversation files here'}</p>
        <p className="mt-1 text-[13px] text-muted">or</p>
        <Button size="sm" className="mt-2" tabIndex={-1} disabled={disabled} onClick={e => { e.stopPropagation(); open(); }}>Browse files</Button>
      </div>

      {files.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface" aria-label="Selected files">
          {files.map(f => (
            <li key={key(f)} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-text"><FileText className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-ink [overflow-wrap:anywhere]">{f.name}</span>
                <span className="block text-[12px] text-muted">{formatBytes(f.size)} · {(FILE_TYPES[fileExt(f.name)] || '').toUpperCase()}</span>
              </span>
              {!disabled && <button type="button" onClick={() => remove(f)} className="icon-btn icon-btn-sm" aria-label={`Remove ${f.name}`}><X aria-hidden="true" /></button>}
            </li>
          ))}
        </ul>
      )}
      <p id="conv-files-help" className="field-help">
        PDF, DOCX, TXT or MD · up to {MAX_CONVERSATION_FILES} files, {maxFileSizeMb} MB each{files.length > 1 ? ` · ${files.length} files, ${formatBytes(total)} in total` : ''}. Each file becomes its own source.
      </p>
      {shownError && <p className="field-error" role="alert">{shownError}</p>}
    </div>
  );
}

const STATUS = {
  queued: [Clock, 'text-faint', 'Waiting'],
  uploading: [Loader2, 'text-primary-text animate-spin', 'Uploading…'],
  done: [CheckCircle2, 'text-success', 'Added'],
  failed: [CircleAlert, 'text-danger', 'Failed']
};

/** Per-file upload status: [{ file, status: 'queued'|'uploading'|'done'|'failed', source?, error? }] */
export function ConversationUploadList({ items }) {
  const finished = items.filter(i => i.status === 'done' || i.status === 'failed').length;
  const pct = items.length ? Math.round((finished / items.length) * 100) : 0;
  return (
    <section className="rounded-2xl border border-line p-4" aria-live="polite">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint">Upload progress</h3>
        <span className="text-[12.5px] text-muted">{finished} of {items.length} finished</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Files uploaded">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => {
          const [Icon, tone, label] = STATUS[it.status] || STATUS.queued;
          return (
            <li key={`${it.file.name}-${i}`} className="flex items-start gap-3 rounded-xl bg-subtle/50 px-3 py-2.5">
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone)} aria-hidden="true" />
              <span className="min-w-0 flex-1 text-[13px]">
                <span className="block font-medium text-ink [overflow-wrap:anywhere]">{it.file.name}</span>
                <span className="block text-muted">
                  {label}
                  {it.status === 'done' && it.source && <> · <Link className="link" to={`/admin/knowledge/${it.source.id}`}>{it.source.title}</Link> queued for anonymising and indexing</>}
                  {it.status === 'failed' && it.error && <> · {it.error.message}{it.error.details?.existingSourceId && <> <Link className="link" to={`/admin/knowledge/${it.error.details.existingSourceId}`}>Open the existing source</Link></>}</>}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
