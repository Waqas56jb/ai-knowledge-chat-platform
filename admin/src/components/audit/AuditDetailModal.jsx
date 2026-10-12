import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { getAuditTargetHref } from '../../services/auditService';
import { formatDateTime, relativeTime } from '../../utils/format';
import Modal from '../common/Modal';
import Button from '../common/Button';
import StatusBadge from '../common/StatusBadge';
import { CopyButton } from '../common/Misc';
import { AuditActor, actionLabel, entityLabel } from './auditUtils';

function Mono({ children, copy, copyLabel }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <code className="truncate font-mono text-[12.5px] text-ink">{children}</code>
      {copy && <CopyButton iconOnly text={copy} label={copyLabel} successMessage={`${copyLabel.replace(/^Copy /, '')} copied.`} />}
    </span>
  );
}

/** Every field of one audit event, with metadata as formatted JSON. */
export default function AuditDetailModal({ entry, open: openProp = true, onClose }) {
  const open = openProp && !!entry;
  const show = !!entry; // keep content rendered during the close animation
  const e = entry || {};
  const href = show ? getAuditTargetHref(e) : null;
  const hasMeta = e.metadata && Object.keys(e.metadata).length > 0;
  const rows = show ? [
    ['Event ID', <Mono key="id" copy={e.id} copyLabel="Copy event ID">{e.id}</Mono>],
    ['Timestamp', <span key="at"><span className="block">{formatDateTime(e.at)} · {relativeTime(e.at)}</span><code className="font-mono text-[11.5px] text-faint">{e.at}</code></span>],
    ['Actor', <span key="actor" className="block min-w-0"><AuditActor entry={e} />{e.actorEmail && e.actorEmail !== e.actorName && <span className="block text-[12px] text-muted">{e.actorEmail}</span>}{e.actorId && <span className="mt-0.5 block"><Mono copy={e.actorId} copyLabel="Copy actor ID">{e.actorId}</Mono></span>}</span>],
    ['Result', <StatusBadge key="r" status={e.result} />],
    ['Action', <span key="action" className="block"><span className="block">{actionLabel(e.action)}</span><code className="font-mono text-[11.5px] text-faint">{e.action}</code></span>],
    ['Entity type', <span key="et">{entityLabel(e.entityType)} <code className="font-mono text-[11.5px] text-faint">({e.entityType})</code></span>],
    ['Target', <span key="target" className="block min-w-0"><span className="block break-words">{e.entityLabel || '—'}</span>{e.entityId && <Mono copy={e.entityId} copyLabel="Copy entity ID">{e.entityId}</Mono>}</span>],
    ['IP address', <code key="ip" className="font-mono text-[12.5px]">{e.ip || '—'}</code>],
    ['Request ID', e.requestId ? <Mono key="rq" copy={e.requestId} copyLabel="Copy request ID">{e.requestId}</Mono> : '—']
  ] : [];

  return (
    <Modal open={open} onClose={onClose} size="lg" title={show ? actionLabel(e.action) : ''}
      description={show ? `Audit event ${e.id}` : undefined}
      footer={<>
        {show && <CopyButton text={JSON.stringify(e, null, 2)} label="Copy as JSON" successMessage="Event JSON copied." />}
        {href && <Button as={Link} to={href} icon={ArrowUpRight} onClick={onClose}>Open target</Button>}
        <Button variant="primary" onClick={onClose}>Close</Button>
      </>}>
      {show && (
        <div className="space-y-5">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-faint">Summary</p>
            <p className="mt-0.5 text-[14px] text-ink">{[e.entityLabel, e.description].filter(Boolean).join(' · ') || '—'}</p>
          </div>
          <dl className="grid gap-x-6 gap-y-4 text-[13.5px] sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[12px] font-medium uppercase tracking-wide text-faint">{label}</dt>
                <dd className="mt-1 min-w-0 text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-faint">Details</p>
            {hasMeta
              ? <pre className="max-h-64 overflow-auto rounded-xl border border-line bg-subtle p-3.5 font-mono text-[12.5px] leading-relaxed text-ink"><code>{JSON.stringify(e.metadata, null, 2)}</code></pre>
              : <p className="rounded-xl border border-dashed border-line px-3.5 py-3 text-[13px] text-muted">No details were recorded for this event.</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}
