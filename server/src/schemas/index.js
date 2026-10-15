/** Request schemas. `.strict()` rejects unexpected fields (e.g. `role` in a self-service profile update). */
import { z } from 'zod';
import { ROLES, USER_STATUSES, SOURCE_STATUSES, VISIBILITIES, JOB_STATUSES, JOB_TYPES, OUTCOMES, REVIEW_STATUSES, GAP_STATUSES } from '../config/constants.js';
import { paginationSchema } from '../utils/pagination.js';

const uuid = z.string().uuid('must be a valid id');
const email = z.string().trim().toLowerCase().email('must be a valid email address').max(254);
const password = z.string().min(8, 'must be at least 8 characters').max(72, 'must be at most 72 characters')
  .regex(/[A-Za-z]/, 'must contain a letter').regex(/\d/, 'must contain a number');
const name = z.string().trim().min(2, 'must be at least 2 characters').max(80);
const tags = z.array(z.string().trim().min(1).max(40)).max(20).default([]);
const optionalText = max => z.string().trim().max(max).optional();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');
const sortDir = z.enum(['asc', 'desc']).default('desc');
const csvFlag = z.enum(['csv', 'json']).default('json');

export const idParam = z.object({ id: uuid });
export const sourceIdParam = z.object({ sourceId: uuid });

/* auth */
export const loginBody = z.object({ email, password: z.string().min(1).max(200) }).strict();
export const refreshBody = z.object({ refreshToken: z.string().min(10).max(4096) }).strict();
export const forgotBody = z.object({ email }).strict();
export const resetBody = z.object({ accessToken: z.string().min(20).max(4096).optional(), tokenHash: z.string().min(10).max(512).optional(), password }).strict()
  .refine(v => !!v.accessToken !== !!v.tokenHash, { message: 'Provide the reset link token.' });
export const inviteTokenBody = z.object({ token: z.string().trim().min(20).max(200) }).strict();
export const acceptInviteBody = z.object({ token: z.string().trim().min(20).max(200), email: email.optional(), fullName: name, password }).strict();

/* users */
export const updateMeBody = z.object({
  fullName: name.optional(), department: optionalText(60), timezone: optionalText(64), language: optionalText(40),
  avatarUrl: z.string().url().max(500).nullable().optional(), preferences: z.record(z.any()).optional()
}).strict();
export const adminUserQuery = paginationSchema.extend({
  q: optionalText(100), status: z.enum(USER_STATUSES).optional(), role: z.enum(ROLES).optional(),
  // business-profile filters (case-insensitive exact match; product/clientType match any listed value)
  country: optionalText(120), state: optionalText(120), city: optionalText(120), businessType: optionalText(120),
  stage: z.enum(['starting', 'growing', 'established']).optional(), product: optionalText(80), clientType: optionalText(80),
  hasProfile: z.enum(['true', 'false']).optional(),
  sort: z.enum(['name', 'email', 'createdAt', 'lastActiveAt', 'conversationCount', 'role', 'status', 'businessName', 'country', 'stage']).default('createdAt'), dir: sortDir, format: csvFlag
});
export const adminUpdateUserBody = z.object({
  fullName: name.optional(), email: email.optional(), role: z.enum(ROLES).optional(), status: z.enum(USER_STATUSES).optional(),
  department: optionalText(60), notes: optionalText(2000), sourceAccess: z.enum(['workspace', 'restricted']).optional(),
  allowedSourceIds: z.array(uuid).max(1000).optional()
}).strict();

/* business profiles (admin) */
const profileText = max => z.string().trim().max(max).nullable().optional();
const profileList = z.array(z.string().trim().min(1).max(80)).max(12).optional();
export const businessProfileBody = z.object({
  businessName: profileText(200), businessType: profileText(120), userRole: profileText(120), city: profileText(120), state: profileText(120), country: profileText(120),
  businessStage: z.enum(['starting', 'growing', 'established']).nullable().optional(), products: profileList, clientTypes: profileList,
  monthlyVolume: profileText(120), monthlyRevenue: profileText(120), metaAdSpend: profileText(120), googleAdSpend: profileText(120),
  teamSize: profileText(120), summary: profileText(2000)
}).strict().refine(v => Object.keys(v).length > 0, { message: 'Provide at least one field.' });
export const releaseProfileFieldsBody = z.object({
  fields: z.array(z.enum(['businessName', 'businessType', 'userRole', 'city', 'state', 'country', 'businessStage', 'products', 'clientTypes', 'monthlyVolume', 'monthlyRevenue', 'metaAdSpend', 'googleAdSpend', 'teamSize', 'summary'])).min(1)
}).strict();

/* invitations */
export const invitationQuery = paginationSchema.extend({ q: optionalText(100), status: z.enum(['pending', 'accepted', 'expired', 'revoked']).optional(), format: csvFlag });
export const createInvitationBody = z.object({
  email, role: z.enum(ROLES), expiresInDays: z.coerce.number().int().min(1).max(60).optional(),
  message: optionalText(500), note: optionalText(300)
}).strict();
export const resendInvitationBody = z.object({ expiresInDays: z.coerce.number().int().min(1).max(60).optional() }).strict();

/* sources */
const visibilityFields = { visibility: z.enum(VISIBILITIES).optional(), allowedUserIds: z.array(uuid).max(1000).optional() };
export const userSourceQuery = paginationSchema.extend({
  q: optionalText(100), type: z.string().max(40).optional(), sort: z.enum(['title', 'createdAt', 'updatedAt']).default('createdAt'), dir: sortDir
});
export const adminSourceQuery = paginationSchema.extend({
  q: optionalText(100), type: z.string().max(40).optional(), status: z.enum(SOURCE_STATUSES).optional(), ownerId: uuid.optional(),
  added: z.enum(['7d', '30d', '90d']).optional(), sort: z.enum(['title', 'createdAt', 'updatedAt', 'chunkCount', 'status', 'type']).default('createdAt'), dir: sortDir, format: csvFlag
});
export const youtubeSourceBody = z.object({
  url: z.string().trim().url().max(500), title: optionalText(300), description: optionalText(2000), tags, transcript: z.string().max(2000000).optional(),
  maxVideos: z.coerce.number().int().min(1).max(500).optional(), hideCitations: z.boolean().optional(), ...visibilityFields
}).strict();
export const textSourceBody = z.object({
  title: z.string().trim().min(1).max(300), description: optionalText(2000), text: z.string().min(1).max(2000000),
  sourceType: z.enum(['business_knowledge', 'txt', 'markdown', 'client_conversation']).default('business_knowledge'), hideCitations: z.boolean().optional(),
  category: optionalText(60), tags, ...visibilityFields
}).strict();
/** Multipart list fields arrive as JSON arrays or comma-separated strings; invalid JSON is left as-is so validation rejects it (422, not 500). */
function listField(v) {
  if (typeof v !== 'string') return v;
  const t = v.trim();
  if (t.startsWith('[')) { try { return JSON.parse(t); } catch { return t; } }
  return t ? t.split(',').map(x => x.trim()).filter(Boolean) : [];
}
/** Multipart fields arrive as strings. */
export const documentFields = z.object({
  title: optionalText(300), description: optionalText(2000),
  tags: z.preprocess(listField, tags),
  visibility: z.enum(VISIBILITIES).optional(),
  allowedUserIds: z.preprocess(listField, z.array(uuid).max(1000).optional()),
  // the file is a client conversation log (chat export, call notes, emails): anonymise + restructure it
  asConversation: z.enum(['true', 'false']).optional(), category: optionalText(60), hideCitations: z.enum(['true', 'false']).optional()
}).strict();
export const updateSourceBody = z.object({
  title: z.string().trim().min(1).max(300).optional(), description: optionalText(2000), tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  notes: optionalText(4000), hideCitations: z.boolean().optional(), ...visibilityFields
}).strict();
/* hide/show citations for many sources (content is still used for answers) */
export const bulkSourcesBody = z.object({ ids: z.array(uuid).min(1).max(500), action: z.enum(['hide_citations', 'show_citations']) }).strict();
export const chunkQuery = paginationSchema.extend({ pageSize: z.coerce.number().int().min(1).max(100).default(20) });

/* jobs */
export const jobQuery = paginationSchema.extend({ q: optionalText(100), status: z.enum(JOB_STATUSES).optional(), type: z.enum(JOB_TYPES).optional(), sourceId: uuid.optional(), format: csvFlag });

/* chat & conversations */
export const chatBody = z.object({
  message: z.string().min(1).max(4000), conversationId: uuid.optional(),
  clientMessageId: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/).optional(),
  scope: z.enum(['all', 'youtube', 'document', 'text', 'conversation']).default('all')
}).strict();
export const conversationQuery = paginationSchema.extend({ q: optionalText(100) });
export const createConversationBody = z.object({ title: z.string().trim().min(1).max(200).optional() }).strict();
export const renameConversationBody = z.object({ title: z.string().trim().min(1).max(200) }).strict();
export const messagesQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(100), before: uuid.optional() });
export const feedbackBody = z.object({ rating: z.enum(['up', 'down']).nullable(), comment: optionalText(1000) }).strict();
export const adminConversationQuery = paginationSchema.extend({
  q: optionalText(100), userId: uuid.optional(), outcome: z.enum(OUTCOMES).optional(), review: z.enum([...REVIEW_STATUSES, 'flagged']).optional(),
  sourceGroup: z.enum(['youtube', 'document', 'text', 'conversation']).optional(), range: z.enum(['7d', '30d', '90d']).optional(),
  sort: z.enum(['title', 'createdAt', 'updatedAt']).default('updatedAt'), dir: sortDir, format: csvFlag
});
export const reviewBody = z.object({ status: z.enum(REVIEW_STATUSES).optional(), note: z.string().trim().min(1).max(1000).optional() }).strict()
  .refine(v => v.status || v.note, { message: 'Provide a review status or a note.' });

/* content gaps (unanswered questions) */
export const gapParam = z.object({ id: z.string().regex(/^[0-9a-f]{32}$/, 'Invalid id') });
export const gapQuery = paginationSchema.extend({
  q: optionalText(100), status: z.enum([...GAP_STATUSES, 'all']).default('all'), range: z.enum(['7d', '30d', '90d']).optional(),
  sort: z.enum(['lastAskedAt', 'askCount', 'firstAskedAt', 'userCount', 'question']).default('lastAskedAt'), dir: sortDir, format: csvFlag
});
export const gapBody = z.object({ status: z.enum(GAP_STATUSES).optional(), note: z.string().trim().max(2000).optional() }).strict()
  .refine(v => v.status !== undefined || v.note !== undefined, { message: 'Provide a status or a note.' });

/* analytics, audit, settings, notifications */
export const analyticsQuery = z.object({ range: z.enum(['today', '7d', '30d', '90d', 'custom']).default('30d'), from: dateStr.optional(), to: dateStr.optional(), format: csvFlag })
  .refine(v => v.range !== 'custom' || (v.from && v.to), { message: 'from and to are required for a custom range' });
export const auditQuery = paginationSchema.extend({
  q: optionalText(100), actorId: uuid.optional(), action: z.string().max(60).optional(), entityType: z.string().max(40).optional(), entityId: z.string().max(100).optional(),
  result: z.enum(['success', 'failure']).optional(), from: dateStr.optional(), to: dateStr.optional(), format: csvFlag
});
export const settingsBody = z.object({ section: z.enum(['platform', 'knowledge', 'security', 'domain_policy', 'chat']), values: z.record(z.any()) }).strict();
export const settingsResetBody = z.object({ section: z.enum(['platform', 'knowledge', 'security', 'domain_policy', 'chat']) }).strict();
export const notificationQuery = z.object({ unread: z.enum(['true', 'false']).optional() });
export const searchQuery = z.object({ q: z.string().trim().min(1).max(100) });
