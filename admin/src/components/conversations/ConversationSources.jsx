import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Library } from 'lucide-react';
import { cn } from '../../utils/cn';
import { pluralize } from '../../utils/format';
import { SourceTypeIcon } from '../common/Misc';
import StatusBadge from '../common/StatusBadge';
import { EmptyState } from '../common/States';
import { SOURCE_ISSUES, aggregateSources, hasSourceIssue, sourceTypeLabel } from './citationUtils';

/** Every source cited in the conversation, with citation counts and the quoted excerpts. */
export default function ConversationSources({ messages }) {
  const sources = aggregateSources(messages);
  if (!sources.length) {
    return <EmptyState icon={Library} title="No sources were cited" description="The answers in this conversation did not reference any knowledge source." />;
  }
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {sources.map(s => {
        const issue = hasSourceIssue(s.status);
        const deleted = s.status === 'deleted';
        return (
          <li key={s.sourceId} className={cn('card card-pad flex flex-col', issue && 'border-warning/40')}>
            <div className="flex items-start gap-3">
              <SourceTypeIcon type={s.type} />
              <div className="min-w-0 flex-1">
                {deleted ? <p className="font-medium text-muted">{s.title}</p> : (
                  <Link to={`/admin/knowledge/${encodeURIComponent(s.sourceId)}`} className="group inline-flex max-w-full items-center gap-1.5 rounded font-medium text-ink">
                    <span className="truncate group-hover:underline">{s.title}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-faint group-hover:text-primary-text" aria-hidden="true" />
                  </Link>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                  <span>{sourceTypeLabel(s.type)}</span>
                  <span className="font-mono text-[11px] text-faint">{s.sourceId}</span>
                  <StatusBadge status={s.status} label={deleted ? 'Deleted' : undefined} tone={deleted ? 'danger' : undefined} />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-[22px] font-semibold leading-none text-ink">{s.count}</p>
                <p className="mt-1 text-[11.5px] text-faint">{s.count === 1 ? 'citation' : 'citations'}</p>
              </div>
            </div>
            {issue && (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] font-medium text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{SOURCE_ISSUES[s.status]}. Answers citing it should be re-checked.
              </p>
            )}
            <div className="mt-3 border-t border-line pt-3">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">Quoted excerpts · {pluralize(s.messageIds.length, 'answer')}</p>
              <ul className="space-y-2">
                {s.excerpts.filter(Boolean).map(e => <li key={e} className="border-l-2 border-line pl-3 text-[13px] italic text-muted">“{e}”</li>)}
              </ul>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
