/**
 * Invitations — /admin/invitations. The server creates and hashes the token; the plain `token` and
 * `url` are returned only by create and resend, so the UI shows them once. No email is sent: the
 * administrator shares the link.
 */
import { apiGet, apiList, apiPost, downloadCsv } from './api';

export const mapInvitation = i => i && ({
  ...i,
  invitedByName: i.invitedByName || 'Former user',
  userId: i.acceptedBy || null,
  message: i.message || '',
  note: i.note || '',
  resendCount: i.resendCount || 0
});

const listQuery = ({ q, status, page, pageSize } = {}) => ({ q: q && q.trim(), status, page, pageSize });

/** Filters: { q, status, page, pageSize } → { rows, meta } (meta.stats) */
export async function getInvitations(filters = {}) {
  const { rows, meta } = await apiList('/admin/invitations', listQuery(filters));
  return { rows: rows.map(mapInvitation), meta };
}

export const exportInvitations = filters => downloadCsv('/admin/invitations', listQuery(filters), 'invitations');

export async function getInvitationById(id) {
  return mapInvitation(await apiGet(`/admin/invitations/${encodeURIComponent(id)}`));
}

/** stats: { total, pending, accepted, expired, revoked } */
export async function getInvitationStats() {
  const { meta } = await apiList('/admin/invitations', { pageSize: 1 });
  return { total: 0, pending: 0, accepted: 0, expired: 0, revoked: 0, ...(meta.stats || {}) };
}

/** payload: { email, role, expiresInDays, message, note } → Invitation & { token, url, delivery } */
export async function createInvitation(payload) {
  const body = { email: payload.email.trim().toLowerCase(), role: payload.role, expiresInDays: Number(payload.expiresInDays) || undefined };
  if (payload.message && payload.message.trim()) body.message = payload.message.trim();
  if (payload.note && payload.note.trim()) body.note = payload.note.trim();
  return mapInvitation(await apiPost('/admin/invitations', body));
}

/** Rotates the token; returns the invitation with the new `token` + `url`. */
export async function resendInvitation(id, expiresInDays) {
  return mapInvitation(await apiPost(`/admin/invitations/${encodeURIComponent(id)}/resend`, expiresInDays ? { expiresInDays: Number(expiresInDays) } : {}));
}

export async function revokeInvitation(id) {
  return mapInvitation(await apiPost(`/admin/invitations/${encodeURIComponent(id)}/revoke`));
}
