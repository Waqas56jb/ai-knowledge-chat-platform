import { Check } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { KINDS } from './wizardModel';

/** Step 1: selectable cards (a radio group with arrow-key support from native radios). */
export default function StepType({ value, onChange, supportedTypes, error }) {
  return (
    <fieldset>
      <legend className="sr-only">Choose a source type</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(KINDS).map(([id, k]) => {
          const enabled = k.types.some(t => supportedTypes.includes(t));
          const active = value === id;
          return (
            <label key={id} className={cn('group relative flex gap-4 rounded-2xl border p-4 transition focus-within:ring-4 focus-within:ring-primary/15',
              !enabled ? 'cursor-not-allowed border-line bg-subtle/50 opacity-60' : active ? 'cursor-pointer border-primary bg-primary-soft/50 shadow-card' : 'cursor-pointer border-line bg-surface hover:border-primary/40 hover:bg-subtle/50')}>
              <input type="radio" name="source-kind" value={id} checked={active} disabled={!enabled} onChange={() => onChange(id)} className="sr-only" />
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl transition', active ? 'bg-primary-strong text-primary-fg' : 'bg-subtle text-muted group-hover:text-ink')}>
                <k.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 pr-5">
                <span className="block text-[14.5px] font-semibold text-ink">{k.label}</span>
                <span className="mt-0.5 block text-[13px] text-muted">{k.description}</span>
                {!enabled && <span className="mt-1 block text-[12px] font-medium text-warning">Turned off in Knowledge settings</span>}
              </span>
              {active && <Check className="absolute right-4 top-4 h-4 w-4 text-primary-text" aria-hidden="true" />}
            </label>
          );
        })}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </fieldset>
  );
}
