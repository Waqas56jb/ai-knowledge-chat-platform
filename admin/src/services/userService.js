/**
 * Users — /admin/users. Authorization (admin only, no self-change, last-admin guard) is enforced by the server;
 * its error messages are shown as-is.
 */
import { apiGet, apiList, apiPatch, apiPost, apiDelete, downloadCsv, listAll } from './api';
import { mapAudit } from './auditService';

/** AdminUser → UI shape (`name` is what the components display). */
export const mapUser = u => u && ({
  ...u,
  name: u.fullName || u.name || u.email,
  department: u.department || '',
  notes: u.notes || '',
  sourceAccess: u.sourceAccess || 'workspace',
  conversationCount: u.conversationCount ?? 0,
  questionsAsked: u.questionsAsked ?? 0
});

const listQuery = ({ q, status, role, sort, dir, page, pageSize } = {}) => ({ q: q && q.trim(), status, role, sort, dir, page, pageSize });

/** Filters: { q, status, role, sort, dir, page, pageSize } → { rows, meta } (meta.stats has the counts). */
export async function getUsers(filters = {}) {
  const { rows, meta } = await apiList('/admin/users', listQuery(filters));
  return { rows: rows.map(mapUser), meta };
}

/** Every user (for pickers). */
export async function getAllUsers(filters = {}) {
  return (await listAll('/admin/users', listQuery({ sort: 'name', dir: 'asc', ...filters }))).map(mapUser);
}

export const exportUsers = filters => downloadCsv('/admin/users', listQuery({ ...filters, page: undefined, pageSize: undefined }), 'users');

/** stats: { total, active, suspended, revoked, pendingInvitations } */
export async function getUserStats() {
  const { meta } = await apiList('/admin/users', { pageSize: 1 });
  const s = meta.stats || {};
  return { total: s.total ?? 0, active: s.active ?? 0, suspended: s.suspended ?? 0, revoked: s.revoked ?? 0, pendingInvitations: s.pending_invitations ?? 0 };
}

export async function getUserById(id) {
  const u = await apiGet(`/admin/users/${encodeURIComponent(id)}`);
  return {
    ...mapUser(u),
    allowedSourceIds: u.allowedSourceIds || [],
    conversations: (u.conversations || []).map(c => ({ ...c, outcome: c.outcome || null })),
    invitations: u.invitations || [],
    accessibleSources: u.accessibleSources || [],
    activity: (u.activity || []).map(mapAudit)
  };
}

/** changes: { name|fullName, email, role, status, department, notes, sourceAccess, allowedSourceIds } */
export async function updateUser(id, changes) {
  const body = { ...changes };
  if ('name' in body) { body.fullName = body.name; delete body.name; }
  ['department', 'notes'].forEach(k => { if (k in body && body[k] == null) body[k] = ''; });
  return mapUser(await apiPatch(`/admin/users/${encodeURIComponent(id)}`, body));
}

export const changeRole = (id, role) => updateUser(id, { role });
export const suspendUser = id => apiPost(`/admin/users/${encodeURIComponent(id)}/suspend`);
export const reactivateUser = id => apiPost(`/admin/users/${encodeURIComponent(id)}/reactivate`);
export const revokeAccess = id => apiPost(`/admin/users/${encodeURIComponent(id)}/revoke`);
export const deleteUser = id => apiDelete(`/admin/users/${encodeURIComponent(id)}`);

const STATUS_CALL = { suspended: suspendUser, active: reactivateUser, revoked: revokeAccess };

/**
 * Bulk actions loop the per-user endpoints. Returns { done: [ids], failed: [{ id, error }] } so the UI
 * can report server refusals (e.g. self-change, last active admin) per user.
 */
async function each(ids, fn) {
  const done = [], failed = [];
  for (const id of ids) {
    try { await fn(id); done.push(id); } catch (error) { failed.push({ id, error }); }
  }
  return { done, failed };
}
export const bulkSetStatus = (ids, status) => each(ids, STATUS_CALL[status]);
export const deleteUsers = ids => each(ids, deleteUser);
