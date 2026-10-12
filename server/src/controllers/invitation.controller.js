import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { toLimitOffset, pageMeta } from '../utils/pagination.js';
import { sendCsv } from '../utils/csv.js';
import * as inv from '../services/invitation.service.js';

const CSV = [
  { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Status' }, { key: 'invitedByName', label: 'Invited by' },
  { key: 'createdAt', label: 'Created' }, { key: 'expiresAt', label: 'Expires' }, { key: 'acceptedAt', label: 'Accepted' }, { key: 'revokedAt', label: 'Revoked' }
];
export const list = asyncHandler(async (req, res) => {
  const q = req.validQuery;
  if (q.format === 'csv') return sendCsv(res, 'invitations', (await inv.listInvitations(q, { limit: 10000, offset: 0 })).rows, CSV);
  const { rows, total } = await inv.listInvitations(q, toLimitOffset(q));
  ok(res, rows, { ...pageMeta(q, total), stats: await inv.invitationStats() });
});
export const get = asyncHandler(async (req, res) => ok(res, await inv.getInvitation(req.params.id)));
export const create = asyncHandler(async (req, res) => ok(res, await inv.createInvitation(req.body, req.user, req), undefined, 201));
export const resend = asyncHandler(async (req, res) => ok(res, await inv.resendInvitation(req.params.id, req.user, req, req.body?.expiresInDays)));
export const revoke = asyncHandler(async (req, res) => ok(res, await inv.revokeInvitation(req.params.id, req.user, req)));
