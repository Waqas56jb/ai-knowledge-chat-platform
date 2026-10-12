import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { toLimitOffset, pageMeta } from '../utils/pagination.js';
import { sendCsv } from '../utils/csv.js';
import { publicProfile } from '../services/auth.service.js';
import * as users from '../services/user.service.js';
import { deleteAllOwnConversations, ownOverview } from '../services/conversation.service.js';
import { recordAudit } from '../services/audit.service.js';

/* self-service */
export const getMe = asyncHandler(async (req, res) => ok(res, publicProfile(req.user)));
export const overview = asyncHandler(async (req, res) => ok(res, await ownOverview(req.user)));
export const updateMe = asyncHandler(async (req, res) => ok(res, publicProfile(await users.updateOwnProfile(req.user, req.body, req))));
export const deleteMyConversations = asyncHandler(async (req, res) => {
  const n = await deleteAllOwnConversations(req.user);
  await recordAudit({ actor: req.user, action: 'conversation.deleted_all', entityType: 'user', entityId: req.user.id, entityLabel: req.user.email, details: { count: n }, req });
  ok(res, { deleted: n });
});

/* admin */
const CSV = [
  { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Status' },
  { key: 'department', label: 'Department' }, { key: 'createdAt', label: 'Created' }, { key: 'lastActiveAt', label: 'Last active' },
  { key: 'conversationCount', label: 'Conversations' }, { key: 'questionsAsked', label: 'Questions' }
];
export const list = asyncHandler(async (req, res) => {
  const q = req.validQuery;
  if (q.format === 'csv') {
    const { rows } = await users.listUsers(q, { limit: 10000, offset: 0 });
    return sendCsv(res, 'users', rows, CSV);
  }
  const { rows, total } = await users.listUsers(q, toLimitOffset(q));
  ok(res, rows, { ...pageMeta(q, total), stats: await users.userStats() });
});
export const stats = asyncHandler(async (_req, res) => ok(res, await users.userStats()));
export const get = asyncHandler(async (req, res) => ok(res, await users.getUser(req.params.id)));
export const update = asyncHandler(async (req, res) => ok(res, await users.updateUser(req.params.id, req.body, req.user, req)));
export const suspend = asyncHandler(async (req, res) => ok(res, await users.setStatus(req.params.id, 'suspended', req.user, req)));
export const reactivate = asyncHandler(async (req, res) => ok(res, await users.setStatus(req.params.id, 'active', req.user, req)));
export const revoke = asyncHandler(async (req, res) => ok(res, await users.setStatus(req.params.id, 'revoked', req.user, req)));
export const remove = asyncHandler(async (req, res) => { await users.deleteUser(req.params.id, req.user, req); ok(res, { deleted: true }); });
