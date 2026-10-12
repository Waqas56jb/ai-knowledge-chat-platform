import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, ScrollText, SearchX, ShieldCheck } from 'lucide-react';
import { getAuditLogs, exportAuditLogs } from '../../services/auditService';
import { AUDIT_ACTIONS, ENTITY_TYPES } from '../../constants/domain';
import { useQuery } from '../../hooks/useQuery';
import { useServerTable } from '../../hooks/useTable';
import { useDebounce, useDocumentTitle } from '../../hooks/useMisc';
import { formatInputDate } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import Button, { IconButton } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import { FilterBar, SearchInput, FilterSelect } from '../../components/common/Filters';
import { ExportButton } from '../../components/common/Misc';
import { EmptyState, ErrorState } from '../../components/common/States';
import AuditDetailModal from '../../components/audit/AuditDetailModal';
import { auditColumns, actionLabel, entityLabel } from '../../components/audit/auditUtils';

const valid = (v, list) => (v && list.includes(v) ? v : 'all');

export default function AuditPage() {
  useDocumentTitle('Audit logs');
  const [params] = useSearchParams();
  const [q, setQ] = useState(() => params.get('q') || '');
  const dq = useDebounce(q);
  const [actorId, setActorId] = useState('all');
  const [action, setAction] = useState(() => valid(params.get('action'), Object.keys(AUDIT_ACTIONS)));
  const [entityType, setEntityType] = useState(() => valid(params.get('entity'), ENTITY_TYPES));
  const [entityId, setEntityId] = useState(() => params.get('entityId') || '');
  const [result, setResult] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const rangeError = from && to && from > to ? 'The “from” date must be on or before the “to” date.' : '';
  const filters = { q: dq, actorId, action, entityType, entityId: entityId || undefined, result, from: rangeError ? undefined : from || undefined, to: rangeError ? undefined : to || undefined };
  const key = JSON.stringify(filters);
  const t = useServerTable({ pageSize: 25, resetKey: key });
  const { data, loading, error, reload } = useQuery(() => getAuditLogs({ ...filters, ...t.query }), [key, t.query]);
  const table = t.bind(data?.rows, data?.meta);
  // actors come from the server (meta.actors); keep the last list while new pages load
  const actors = (data?.meta?.actors || []).filter(a => a.id);

  const active = !!q || !!from || !!to || !!entityId || [actorId, action, entityType, result].some(v => v !== 'all');
  const clear = () => { setQ(''); setActorId('all'); setAction('all'); setEntityType('all'); setEntityId(''); setResult('all'); setFrom(''); setTo(''); };
  const view = row => { setSelected(row); setModalOpen(true); };
  const today = formatInputDate(Date.now());

  if (error) return <Card><ErrorState error={error} onRetry={reload} title="Audit logs could not be loaded" /></Card>;

  return (
    <>
      <PageHeader title="Audit logs" description="Who did what, when, and to which record — across users, invitations, sources, processing, conversations and settings."
        actions={<ExportButton disabled={!table.total} onExport={() => exportAuditLogs(filters)} />} />

      <Card>
        <FilterBar active={active} onClear={clear}>
          <SearchInput value={q} onChange={setQ} placeholder="Search actions, targets, emails, IDs" label="Search audit logs" />
          <FilterSelect label="Actor" value={actorId} onChange={setActorId} options={[['all', 'All actors'], ...actors.map(a => [a.id, a.name])]} />
          <FilterSelect label="Action" value={action} onChange={setAction} options={[['all', 'All actions'], ...Object.keys(AUDIT_ACTIONS).map(k => [k, actionLabel(k)])]} />
          <FilterSelect label="Entity type" value={entityType} onChange={setEntityType} options={[['all', 'All entities'], ...ENTITY_TYPES.map(t => [t, entityLabel(t)])]} />
          <FilterSelect label="Result" value={result} onChange={setResult} options={[['all', 'All results'], ['success', 'Success'], ['failure', 'Failure']]} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[12.5px] text-muted">From
              <input type="date" className="input h-9 w-[150px]" value={from} max={to || today} onChange={e => setFrom(e.target.value)} aria-invalid={rangeError ? 'true' : 'false'} aria-describedby={rangeError ? 'audit-range-err' : undefined} />
            </label>
            <label className="flex items-center gap-1.5 text-[12.5px] text-muted">To
              <input type="date" className="input h-9 w-[150px]" value={to} min={from || undefined} max={today} onChange={e => setTo(e.target.value)} aria-invalid={rangeError ? 'true' : 'false'} aria-describedby={rangeError ? 'audit-range-err' : undefined} />
            </label>
          </div>
          {entityId && <button type="button" className="badge badge-primary" onClick={() => setEntityId('')} title="Remove this filter">Record {entityId.slice(0, 8)}… ×</button>}
          {rangeError && <p id="audit-range-err" className="field-error mt-0 w-full" role="alert">{rangeError} The date filter is ignored until this is fixed.</p>}
        </FilterBar>
        <DataTable columns={auditColumns} rows={table.pageRows} table={table} loading={loading} caption="Audit events" dense
          getRowLabel={r => `${actionLabel(r.action)} ${r.id}`}
          onRowClick={view}
          rowActions={r => <IconButton icon={Eye} size="sm" label="View event details" onClick={() => view(r)} />}
          empty={active
            ? <EmptyState icon={SearchX} title="No events match these filters" description="Widen the date range or clear some filters." action={<Button onClick={clear}>Clear filters</Button>} />
            : <EmptyState icon={ScrollText} title="No audit events yet" description="Administrative actions will be listed here as they happen." />} />
        <Pagination table={table} label="events" sizes={[10, 25, 50, 100]} />
      </Card>

      <p className="mt-4 flex items-center gap-2 text-[12.5px] text-faint">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />The audit trail is written by the server for every privileged action and cannot be edited from this console.
      </p>

      <AuditDetailModal entry={selected} open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
