import { format } from 'date-fns';
import { CheckCircle2, Circle, Loader2, XCircle, MinusCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CopyButton } from '../common/Misc';

const STEP = {
  completed: { icon: CheckCircle2, cls: 'text-success', label: 'Completed' },
  running: { icon: Loader2, cls: 'animate-spin text-info', label: 'Running' },
  failed: { icon: XCircle, cls: 'text-danger', label: 'Failed' },
  pending: { icon: Circle, cls: 'text-faint', label: 'Pending' },
  skipped: { icon: MinusCircle, cls: 'text-faint', label: 'Skipped' }
};

/** Vertical step list with status icons. Steps of a cancelled job read as "Skipped". */
export function JobSteps({ steps = [], jobStatus }) {
  return (
    <ol className="space-y-0.5">
      {steps.map((s, i) => {
        const st = jobStatus === 'cancelled' && s.status === 'pending' ? 'skipped' : s.status;
        const m = STEP[st] || STEP.pending;
        return (
          <li key={s.name} className={cn('flex items-center gap-3 rounded-lg px-2 py-1.5', st === 'running' && 'bg-info-soft/60')}>
            <m.icon className={cn('h-4 w-4 shrink-0', m.cls)} aria-hidden="true" />
            <span className={cn('flex-1 text-[13.5px]', st === 'pending' || st === 'skipped' ? 'text-muted' : 'text-ink', st === 'running' && 'font-medium')}>
              <span className="mr-1.5 text-faint">{i + 1}.</span>{s.name}
            </span>
            <span className={cn('text-[12px]', st === 'failed' ? 'text-danger' : st === 'running' ? 'text-info' : 'text-faint')}>{m.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

const LEVEL = { info: 'text-info', warn: 'text-warning', error: 'text-danger', debug: 'text-faint' };
const time = at => { try { return format(new Date(at), 'HH:mm:ss'); } catch (e) { return '--:--:--'; } };

/** Monospace log viewer with level colours and timestamps. */
export function JobLogs({ logs = [], jobId }) {
  const text = logs.map(l => `${l.at} [${String(l.level || 'info').toUpperCase()}] ${l.message}`).join('\n');
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-subtle/60">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="text-[12px] font-medium text-muted">{logs.length} {logs.length === 1 ? 'entry' : 'entries'}</span>
        {logs.length > 0 && <CopyButton text={text} label={`Copy logs for job ${String(jobId).slice(0, 8)}`} iconOnly successMessage="Logs copied." />}
      </div>
      <ol className="max-h-72 overflow-y-auto px-3 py-2 font-mono text-[12px] leading-relaxed" aria-label="Job logs">
        {!logs.length && <li className="text-faint">No log entries yet.</li>}
        {logs.map((l, i) => (
          <li key={i} className="flex gap-2.5 break-words">
            <time className="shrink-0 text-faint" dateTime={l.at}>{time(l.at)}</time>
            <span className={cn('w-11 shrink-0 font-semibold uppercase', LEVEL[l.level] || 'text-muted')}>{l.level}</span>
            <span className="min-w-0 flex-1 text-ink">{l.message}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
