import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { SourceTypeIcon } from '../common/Misc';
import StatusBadge from '../common/StatusBadge';
import { SOURCE_ISSUES, citationDomId, hasSourceIssue, sourceTypeLabel } from './citationUtils';

/**
 * One citation under an assistant answer: marker number, source title/type/status and the excerpt.
 * Links to the source page unless the source was deleted.
 */
export default function CitationCard({ messageId, citation, highlighted = false }) {
  const { n, sourceId, sourceTitle, sourceType, sourceStatus, excerpt } = citation;
  const issue = hasSourceIssue(sourceStatus);
  const deleted = sourceStatus === 'deleted';
  const title = (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate font-medium text-ink group-hover:underline">{sourceTitle}</span>
      {!deleted && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-faint group-hover:text-primary-text" aria-hidden="true" />}
    </span>
  );

  return (
    <li id={citationDomId(messageId, n)} tabIndex={-1}
      className={cn('scroll-mt-24 rounded-xl border bg-surface p-3 outline-none transition-[box-shadow,border-color] duration-300',
        highlighted ? 'border-primary ring-4 ring-primary/20' : issue ? 'border-warning/40' : 'border-line')}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-6 min-w-6 shrink-0 place-items-center rounded-md bg-primary-soft px-1 font-mono text-[11.5px] font-semibold text-primary-text" aria-label={`Citation ${n}`}>{n}</span>
        <SourceTypeIcon type={sourceType} size="sm" />
        <div className="min-w-0 flex-1">
          {deleted
            ? <span className="flex min-w-0 items-center gap-1.5 text-muted">{sourceTitle}</span>
            : <Link to={`/admin/knowledge/${encodeURIComponent(sourceId)}`} className="group block min-w-0 rounded">{title}</Link>}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
            <span>{sourceTypeLabel(sourceType)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[11px] text-faint">{sourceId}</span>
            <StatusBadge status={sourceStatus} label={deleted ? 'Deleted' : undefined} tone={deleted ? 'danger' : undefined} />
          </div>
          {excerpt && <blockquote className="mt-2 line-clamp-3 border-l-2 border-line pl-3 text-[13px] italic text-muted">“{excerpt}”</blockquote>}
          {issue && (
            <p className="mt-2 flex items-start gap-1.5 text-[12.5px] font-medium text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {SOURCE_ISSUES[sourceStatus]}: this answer may no longer be supported by the knowledge base.
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
