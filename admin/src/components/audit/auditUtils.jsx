import { Link } from 'react-router-dom';
import { ArrowUpRight, Cpu } from 'lucide-react';
import { actionLabel as labelFor, getAuditTargetHref } from '../../services/auditService';
import { capitalize, formatDateTime, relativeTime } from '../../utils/format';
import Avatar from '../common/Avatar';
import StatusBadge from '../common/StatusBadge';

export const ENTITY_LABELS = { auth: 'Authentication', user: 'User', invitation: 'Invitation', source: 'Source', job: 'Processing job', conversation: 'Conversation', settings: 'Settings' };
export const entityLabel = t => ENTITY_LABELS[t] || capitalize(t || '');
export const actionLabel = labelFor;

/** Actor avatar + name. Events without an actor (worker, CLI) get a neutral icon. */
export function AuditActor({ entry, size = 'xs' }) {
  const system = !entry.actorId;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {system
        ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-subtle text-muted" aria-hidden="true"><Cpu className="h-3.5 w-3.5" /></span>
        : <Avatar name={entry.actorName} size={size} />}
      <span className="truncate">{entry.actorName}</span>
    </span>
  );
}

/** Human action label with the raw action key underneath. */
export function AuditAction({ action }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate font-medium text-ink">{actionLabel(action)}</span>
      <code className="block truncate font-mono text-[11px] text-faint">{action}</code>
    </span>
  );
}

/** Entity type + label, linked to the entity page when the record still exists. */
export function AuditTarget({ entry }) {
  const href = getAuditTargetHref(entry);
  const label = entry.entityLabel || entry.entityId || '—';
  return (
    <span className="block min-w-0">
      <span className="block text-[11.5px] font-semibold uppercase tracking-wide text-faint">{entityLabel(entry.entityType)}</span>
      {href
        ? <Link to={href} onClick={e => e.stopPropagation()} className="group inline-flex max-w-full items-center gap-1 rounded font-medium text-primary-text">
            <span className="truncate group-hover:underline">{label}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </Link>
        : <span className="block truncate text-ink">{label}</span>}
    </span>
  );
}

export function AuditTime({ at }) {
  return (
    <time dateTime={at} title={relativeTime(at)} className="block whitespace-nowrap">
      <span className="block text-ink">{formatDateTime(at)}</span>
      <span className="block text-[12px] text-faint">{relativeTime(at)}</span>
    </time>
  );
}

export const auditColumns = [
  { key: 'at', header: 'Timestamp', mobile: 'secondary', render: r => <AuditTime at={r.at} /> },
  { key: 'actorName', header: 'Actor', render: r => <AuditActor entry={r} /> },
  { key: 'action', header: 'Action', mobile: 'primary', className: 'max-w-[220px]', render: r => <AuditAction action={r.action} /> },
  { key: 'entityLabel', header: 'Target', className: 'max-w-[220px]', render: r => <AuditTarget entry={r} /> },
  { key: 'description', header: 'Details', mobile: 'hidden', className: 'min-w-[220px] max-w-[360px]', render: r => <span className="line-clamp-2 text-muted">{r.description || '—'}</span> },
  { key: 'result', header: 'Result', mobile: 'secondary', render: r => <StatusBadge status={r.result} /> }
];

