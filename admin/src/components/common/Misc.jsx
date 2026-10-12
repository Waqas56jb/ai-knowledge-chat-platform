import { useState } from 'react';
import { Check, Copy, Download, Info, Youtube, FileText, FileType, AlignLeft, Hash, Building2, MessagesSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import { copyText } from '../../hooks/useMisc';
import { relativeTime, formatDateTime } from '../../utils/format';
import Button from './Button';
import Tooltip from './Tooltip';

/** Copy-to-clipboard button with feedback. */
export function CopyButton({ text, label = 'Copy', successMessage = 'Copied to clipboard.', size = 'sm', variant = 'secondary', iconOnly = false, className }) {
  const [done, setDone] = useState(false);
  const copy = async e => {
    e?.stopPropagation();
    const ok = await copyText(text);
    if (ok) { setDone(true); toast.success(successMessage); setTimeout(() => setDone(false), 1600); } else toast.error('Copy is not available in this browser.');
  };
  if (iconOnly) return (
    <Tooltip label={label}><button type="button" onClick={copy} className={cn('icon-btn icon-btn-sm', className)} aria-label={label}>{done ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button></Tooltip>
  );
  return <Button size={size} variant={variant} icon={done ? Check : Copy} onClick={copy} className={className}>{label}</Button>;
}

/**
 * CSV export. `onExport` may be async (e.g. a server `?format=csv` download) and may return a row count
 * or `{ filename }`.
 * <ExportButton onExport={() => exportUsers(filters)} disabled={!total} />
 */
export function ExportButton({ onExport, label = 'Export CSV', disabled, size = 'md' }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const r = await onExport();
      if (typeof r === 'number') toast.success(`Exported ${r} ${r === 1 ? 'row' : 'rows'} to CSV.`);
      else toast.success('CSV export downloaded.', r && r.filename ? { description: r.filename } : undefined);
    } catch (err) {
      toast.error('Export failed.', { description: err.message });
    } finally { setBusy(false); }
  };
  return <Button size={size} icon={Download} disabled={disabled || busy} loading={busy} onClick={run}>{label}</Button>;
}

/** Inline informational notice. */
export function Notice({ children, title = 'Note', className, tone = 'primary' }) {
  return (
    <div role="note" className={cn('flex gap-3 rounded-xl border px-4 py-3 text-[13px]', tone === 'primary' ? 'border-primary/30 bg-primary-soft/60 text-ink' : 'border-warning/30 bg-warning-soft text-ink', className)}>
      <Info className={cn('mt-0.5 h-4 w-4 shrink-0', tone === 'primary' ? 'text-primary-text' : 'text-warning')} aria-hidden="true" />
      <div><b className="font-semibold">{title}.</b> <span className="text-muted">{children}</span></div>
    </div>
  );
}

/** Thin progress bar. */
export function ProgressBar({ value, tone = 'primary', label, className }) {
  const color = { primary: 'bg-primary-strong', success: 'bg-success', danger: 'bg-danger', info: 'bg-info', neutral: 'bg-faint' }[tone];
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-subtle', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-label={label || 'Progress'}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

const TYPE_ICON = { youtube: Youtube, pdf: FileText, docx: FileType, txt: AlignLeft, markdown: Hash, business_knowledge: Building2, client_conversation: MessagesSquare };
const TYPE_TONE = { youtube: 'bg-danger-soft text-danger', pdf: 'bg-primary-soft text-primary-text', docx: 'bg-info-soft text-info', txt: 'bg-subtle text-muted', markdown: 'bg-subtle text-muted', business_knowledge: 'bg-success-soft text-success', client_conversation: 'bg-[#f1e8f5] text-[#7a5a8c] dark:bg-[#271a30] dark:text-[#d6b8e8]' };

/** Icon tile for a knowledge-source type. */
export function SourceTypeIcon({ type, size = 'md', className }) {
  const Icon = TYPE_ICON[type] || FileText;
  return <span className={cn('inline-grid shrink-0 place-items-center rounded-lg', size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11 rounded-xl' : 'h-9 w-9', TYPE_TONE[type] || 'bg-subtle text-muted', className)} aria-hidden="true"><Icon className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} /></span>;
}

/**
 * Vertical activity timeline.
 * items: [{ id, icon, title, description, at, onClick?, tone?: 'primary'|'success'|'danger'|'warning'|'info'|'neutral' }]
 */
export function ActivityTimeline({ items, emptyText = 'No activity yet.' }) {
  if (!items.length) return <p className="px-1 py-4 text-[13.5px] text-muted">{emptyText}</p>;
  const tones = { primary: 'bg-primary-soft text-primary-text', success: 'bg-success-soft text-success', danger: 'bg-danger-soft text-danger', warning: 'bg-warning-soft text-warning', info: 'bg-info-soft text-info', neutral: 'bg-subtle text-muted' };
  return (
    <ol className="relative space-y-1">
      {items.map((it, i) => {
        const Icon = it.icon;
        const content = (
          <>
            <span className={cn('relative z-[1] grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-surface', tones[it.tone || 'neutral'])}>{Icon && <Icon className="h-4 w-4" aria-hidden="true" />}</span>
            <span className="min-w-0 flex-1 pt-0.5">
              <span className="block text-[13.5px] font-medium text-ink">{it.title}</span>
              {it.description && <span className="block text-[13px] text-muted [overflow-wrap:anywhere]">{it.description}</span>}
              <time className="mt-0.5 block text-[12px] text-faint" dateTime={it.at} title={formatDateTime(it.at)}>{relativeTime(it.at)}</time>
            </span>
          </>
        );
        return (
          <li key={it.id} className="relative">
            {i < items.length - 1 && <span className="absolute left-[15px] top-9 h-[calc(100%-20px)] w-px bg-line" aria-hidden="true" />}
            {it.onClick
              ? <button type="button" onClick={it.onClick} className="flex w-full gap-3 rounded-xl p-1.5 text-left transition hover:bg-subtle">{content}</button>
              : <div className="flex gap-3 p-1.5">{content}</div>}
          </li>
        );
      })}
    </ol>
  );
}

