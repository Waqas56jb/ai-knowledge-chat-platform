/**
 * Audit logs — /admin/audit-logs (read-only, written by the server for every privileged action).
 * Rows arrive in snake_case; mapAudit() converts them to the shape the UI components use.
 */
import { apiGet, apiList, downloadCsv } from './api';
import { AUDIT_ACTIONS } from '../constants/domain';

const humanize = s => String(s).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();

/** Short readable summary of an event's `details` object. */
export function describeDetails(details) {
  if (!details || typeof details !== 'object') return '';
  const parts = [];
  if (details.from !== undefined && details.to !== undefined) parts.push(`${humanize(details.from ?? '—')} → ${humanize(details.to ?? '—')}`);
  if (Array.isArray(details.changed) && details.changed.length) parts.push(`Changed ${details.changed.map(humanize).join(', ')}`);
  if (details.reason) parts.push(String(details.reason));
  if (details.email && !parts.length) parts.push(String(details.email));
  if (details.role && !parts.length) parts.push(`Role ${details.role}`);
  if (details.retryOf) parts.push('Retry of an earlier job');
  if (details.error) parts.push(String(details.error));
  return parts.join(' · ');
}

export const mapAudit = r => r && ({
  id: r.id,
  at: r.created_at,
  actorId: r.actor_id,
  actorName: r.actor_name || r.actor_email || (r.actor_id ? 'Unknown user' : 'System'),
  actorEmail: r.actor_email || null,
  action: r.action,
  entityType: r.entity_type,
  entityId: r.entity_id,
  entityLabel: r.entity_label || '',
  description: describeDetails(r.details),
  result: r.result,
  ip: r.ip,
  requestId: r.request_id,
  metadata: r.details || {}
});

const listQuery = ({ q, actorId, action, entityType, entityId, result, from, to, page, pageSize } = {}) =>
  ({ q: q && q.trim(), actorId, action, entityType, entityId, result, from, to, page, pageSize });

/** Filters: { q, actorId, action, entityType, entityId, result, from, to, page, pageSize } → { rows, meta } (meta.actors) */
export async function getAuditLogs(filters = {}) {
  const { rows, meta } = await apiList('/admin/audit-logs', listQuery(filters));
  return { rows: rows.map(mapAudit), meta };
}

export const exportAuditLogs = filters => downloadCsv('/admin/audit-logs', listQuery(filters), 'audit-logs');

export async function getAuditLogById(id) {
  return mapAudit(await apiGet(`/admin/audit-logs/${encodeURIComponent(id)}`));
}

export const actionLabel = a => AUDIT_ACTIONS[a] || (a ? humanize(a.replace('.', ' ')).replace(/^./, c => c.toUpperCase()) : '—');

const SETTINGS_PAGES = { platform: 'platform', knowledge: 'knowledge', security: 'security', domain_policy: 'domain-policy', chat: 'chat', profile: 'profile' };

/**
 * Admin-console link for an audit entry's target, or null when it has no page (or was deleted).
 * Invitations and jobs open their list page focused on the record.
 */
export function getAuditTargetHref(entry) {
  if (!entry || !entry.entityId || /\.deleted$/.test(entry.action || '')) return null;
  const enc = encodeURIComponent(entry.entityId);
  switch (entry.entityType) {
    case 'user': return `/admin/users/${enc}`;
    case 'auth': return /^[0-9a-f-]{36}$/i.test(entry.entityId) ? `/admin/users/${enc}` : null;
    case 'source': return `/admin/knowledge/${enc}`;
    case 'conversation': return `/admin/conversations/${enc}`;
    case 'invitation': return `/admin/invitations?focus=${enc}`;
    case 'job': return `/admin/processing?job=${enc}`;
    case 'settings': return SETTINGS_PAGES[entry.entityId] ? `/admin/settings/${SETTINGS_PAGES[entry.entityId]}` : '/admin/settings';
    default: return null;
  }
}
