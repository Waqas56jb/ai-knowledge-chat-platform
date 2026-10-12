import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Tag entry: Enter or comma adds, Backspace on an empty field removes the last tag.
 * Receives id / aria-* from FormField and applies them to the text input.
 */
export default function TagInput({ value = [], onChange, id, max = 10, maxLength = 30, placeholder = 'Add a tag and press Enter', className, ...aria }) {
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState('');

  const add = raw => {
    const parts = String(raw).split(',').map(t => t.trim().replace(/\s+/g, ' ')).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const t of parts) {
      if (t.length > maxLength) { setHint(`Tags must be ${maxLength} characters or fewer.`); continue; }
      if (next.length >= max) { setHint(`You can add up to ${max} tags.`); break; }
      if (!next.some(x => x.toLowerCase() === t.toLowerCase())) next.push(t);
    }
    onChange(next); setDraft('');
  };
  const removeAt = i => { onChange(value.filter((_, j) => j !== i)); setHint(''); };

  const onKeyDown = e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
    else if (e.key === 'Backspace' && !draft && value.length) removeAt(value.length - 1);
  };

  return (
    <div>
      <div className={cn('flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15', className)}>
        {value.map((t, i) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-md bg-subtle py-0.5 pl-2 pr-1 text-[12.5px] font-medium text-ink">
            {t}
            <button type="button" onClick={() => removeAt(i)} className="grid h-5 w-5 place-items-center rounded text-faint hover:bg-line hover:text-ink" aria-label={`Remove tag ${t}`}>
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input id={id} {...aria} value={draft} onChange={e => { setDraft(e.target.value); setHint(''); }} onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)} placeholder={value.length ? '' : placeholder}
          className="h-7 min-w-[8rem] flex-1 border-0 bg-transparent px-1 text-[14px] text-ink outline-none placeholder:text-faint" />
      </div>
      <p className="mt-1.5 text-[12px] text-faint" aria-live="polite">{hint || `${value.length}/${max} tags · Enter or comma to add`}</p>
    </div>
  );
}
