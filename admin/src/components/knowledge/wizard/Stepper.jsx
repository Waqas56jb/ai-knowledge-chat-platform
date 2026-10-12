import { Check } from 'lucide-react';
import { cn } from '../../../utils/cn';

/** Horizontal step indicator. Completed steps are buttons that jump back. */
export default function Stepper({ steps, current, onJump }) {
  return (
    <nav aria-label="Add source progress">
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((s, i) => {
          const done = i < current, active = i === current;
          const dot = (
            <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold transition',
              done ? 'bg-primary-strong text-primary-fg' : active ? 'bg-ink text-surface' : 'border border-line bg-surface text-faint')}>
              {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
            </span>
          );
          const text = <span className={cn('text-[13px] font-medium', active ? 'text-ink' : done ? 'text-muted' : 'text-faint', !active && 'hidden sm:inline')}>{s.label}</span>;
          return (
            <li key={s.id} className={cn('flex min-w-0 items-center gap-2 sm:gap-3', i < steps.length - 1 && 'flex-1')} aria-current={active ? 'step' : undefined}>
              {done && onJump
                ? <button type="button" onClick={() => onJump(i)} className="flex items-center gap-2 rounded-full pr-1 hover:opacity-80" aria-label={`Back to step ${i + 1}: ${s.label}`}>{dot}{text}</button>
                : <span className="flex items-center gap-2">{dot}{text}<span className="sr-only">{active ? ' (current step)' : ' (not started)'}</span></span>}
              {i < steps.length - 1 && <span className={cn('h-px min-w-3 flex-1 rounded-full', done ? 'bg-primary-strong' : 'bg-line')} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
