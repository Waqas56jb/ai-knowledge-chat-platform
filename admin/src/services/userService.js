/**
 * Users — /admin/users. Authorization (admin only, no self-change, last-admin guard) is enforced by the server;
 * its error messages are shown as-is.
 */
import { apiGet, apiList, apiPatch, apiPost, apiDelete, downloadCsv, listAll } from './api';
import { mapAudit } from './auditService';

/** AdminUser → UI shape (`name` is what the components display). */
const EMPTY_BUSINESS = { name: null, type: null, role: null, city: null, state: null, country: null, stage: null, products: [], clientTypes: [], revenue: null, metaAdSpend: null, googleAdSpend: null, updatedAt: null };

export const mapUser = u => u && ({
  ...u,
  business: { ...EMPTY_BUSINESS, ...(u.business || {}), products: u.business?.products || [], clientTypes: u.business?.clientTypes || [] },
  name: u.fullName || u.name || u.email,
  department: u.department || '',
  notes: u.notes || '',
  sourceAccess: u.sourceAccess || 'workspace',
  conversationCount: u.conversationCount ?? 0,
  questionsAsked: u.questionsAsked ?? 0
});

/** Hidden business-profile filters (case-insensitive exact matches on the server; `product`/`clientType` match any list value). */
export const PROFILE_FILTERS = ['country', 'state', 'city', 'businessType', 'stage', 'product', 'clientType', 'hasProfile'];

const listQuery = ({ q, status, role, sort, dir, page, pageSize, ...rest } = {}) => {
  const out = { q: q && q.trim(), status, role, sort, dir, page, pageSize };
  PROFILE_FILTERS.forEach(k => { if (rest[k] != null && rest[k] !== '' && rest[k] !== 'all') out[k] = String(rest[k]); });
  return out;
};

/**
 * Filters: { q, status, role, country, state, city, businessType, stage, product, clientType, hasProfile ('true'|'false'),
 * sort, dir, page, pageSize } → { rows, meta } (meta.stats has the counts). `q` also matches the business name.
 */
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

/**
 * Values for the business-profile filter dropdowns:
 * { countries, states, businessTypes, products, clientTypes: [{ value, count }], stages: ['starting','growing','established'] }
 */
export async function getInsightOptions() {
  const o = await apiGet('/admin/users/insight-options');
  const list = v => (Array.isArray(v) ? v.filter(x => x && x.value) : []);
  return { countries: list(o?.countries), states: list(o?.states), businessTypes: list(o?.businessTypes), products: list(o?.products), clientTypes: list(o?.clientTypes), stages: o?.stages || ['starting', 'growing', 'established'] };
}

/* ------------------------- hidden business profile ------------------------- */

/** BusinessProfile → UI shape (lists and manualFields always arrays). */
export const mapBusinessProfile = p => p && ({ ...p, products: p.products || [], clientTypes: p.clientTypes || [], manualFields: p.manualFields || [] });

const profilePath = id => `/admin/users/${encodeURIComponent(id)}/business-profile`;
export const getBusinessProfile = async id => mapBusinessProfile(await apiGet(profilePath(id)));
/** changes: any of { businessName, businessType, userRole, city, state, country, businessStage, products, clientTypes, monthlyVolume, teamSize, monthlyRevenue, metaAdSpend, googleAdSpend, summary } (free text, max 120 chars except name/summary). Edited fields become manual (the AI never overwrites them). */
export const updateBusinessProfile = async (id, changes) => mapBusinessProfile(await apiPatch(profilePath(id), changes));
/** Rebuild from the user's conversations now (uses the AI). */
export const refreshBusinessProfile = async id => mapBusinessProfile(await apiPost(`${profilePath(id)}/refresh`));
/** Hand fields back to the AI (removes them from manualFields). */
export const releaseBusinessProfileFields = async (id, fields) => mapBusinessProfile(await apiPost(`${profilePath(id)}/release`, { fields }));
export const clearBusinessProfile = id => apiDelete(profilePath(id));

export async function getUserById(id) {
  const u = await apiGet(`/admin/users/${encodeURIComponent(id)}`);
  return {
    ...mapUser(u),
    businessProfile: mapBusinessProfile(u.businessProfile || null),
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
