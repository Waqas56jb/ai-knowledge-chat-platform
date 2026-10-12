import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { toLimitOffset, pageMeta } from '../utils/pagination.js';
import { sendCsv } from '../utils/csv.js';
import { publicProfile } from '../services/auth.service.js';
import * as users from '../services/user.service.js';
import { deleteAllOwnConversations, ownOverview } from '../services/conversation.service.js';
import * as insights from '../services/insight.service.js';
import { recordAudit } from '../services/audit.service.js';

/* self-service */
export const getMe = asyncHandler(async (req, res) => ok(res, publicProfile(req.user)));
export const overview = asyncHandler(async (req, res) => ok(res, await ownOverview(req.user)));
export const updateMe = asyncHandler(async (req, res) => ok(res, publicProfile(await users.updateOwnProfile(req.user, req.body, req))));
export const deleteMyConversations = asyncHandler(async (req, res) => {
  const n = await deleteAllOwnConversations(req.user);
  // the business profile was learned from these conversations, so it goes with them
  await insights.clearInsight(req.user.id);
  await recordAudit({ actor: req.user, action: 'conversation.deleted_all', entityType: 'user', entityId: req.user.id, entityLabel: req.user.email, details: { count: n }, req });
  ok(res, { deleted: n });
});

/* admin */
const CSV = [
  { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Status' },
  { key: 'department', label: 'Department' }, { key: 'createdAt', label: 'Created' }, { key: 'lastActiveAt', label: 'Last active' },
  { key: 'conversationCount', label: 'Conversations' }, { key: 'questionsAsked', label: 'Questions' },
  { label: 'Business name', value: u => u.business.name }, { label: 'Business type', value: u => u.business.type },
  { label: 'Their role', value: u => u.business.role }, { label: 'City', value: u => u.business.city },
  { label: 'State', value: u => u.business.state }, { label: 'Country', value: u => u.business.country },
  { label: 'Stage', value: u => u.business.stage }, { label: 'Products', value: u => u.business.products.join('; ') },
  { label: 'Clients', value: u => u.business.clientTypes.join('; ') }
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

/* hidden business profiles (admin) */
export const insightOptions = asyncHandler(async (_req, res) => ok(res, await insights.insightFilterOptions()));
export const getBusinessProfile = asyncHandler(async (req, res) => ok(res, await insights.getInsight(req.params.id)));
export const updateBusinessProfile = asyncHandler(async (req, res) => ok(res, await insights.updateInsight(req.params.id, req.body, req.user, req)));
export const releaseBusinessProfileFields = asyncHandler(async (req, res) => ok(res, await insights.releaseManualFields(req.params.id, req.body.fields, req.user, req)));
export const clearBusinessProfile = asyncHandler(async (req, res) => ok(res, { cleared: await insights.clearInsight(req.params.id, req.user, req) }));
export const refreshBusinessProfile = asyncHandler(async (req, res) => {
  const user = await users.getUser(req.params.id); // 404 for unknown users
  const p = await insights.refreshInsight(user.id, { force: true });
  await recordAudit({ actor: req.user, action: 'user.business_profile_refreshed', entityType: 'user', entityId: user.id, entityLabel: user.email, req });
  ok(res, p || await insights.getInsight(user.id));
});
