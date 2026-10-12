/**
 * Platform settings stored in ai_knowledge_chat_settings and validated by section.
 * Never contains secrets (API keys stay in server/.env).
 */
import { z } from 'zod';
import { one, many } from '../config/database.js';
import { T, SOURCE_TYPES, FALLBACK_ANSWER } from '../config/constants.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from './audit.service.js';

const text = (max, min = 0) => z.string().trim().min(min).max(max);

export const SECTIONS = {
  platform: {
    scope: 'public',
    schema: z.object({
      displayName: text(80, 1),
      description: text(500),
      defaultLanguage: text(40, 1),
      invitationOnly: z.boolean(),
      defaultInvitationExpiryDays: z.number().int().min(1).max(60),
      maxFileSizeMb: z.number().int().min(1).max(env.MAX_UPLOAD_SIZE_MB),
      defaultVisibility: z.enum(['workspace', 'restricted', 'private'])
    }).strict(),
    defaults: { displayName: 'NEXUS AI', description: 'An AI workspace for asking questions about your own videos, documents and business knowledge.', defaultLanguage: 'English', invitationOnly: true, defaultInvitationExpiryDays: 7, maxFileSizeMb: env.MAX_UPLOAD_SIZE_MB, defaultVisibility: 'workspace' }
  },
  knowledge: {
    scope: 'admin',
    schema: z.object({
      supportedTypes: z.array(z.enum(SOURCE_TYPES)).min(1),
      chunkSize: z.number().int().min(200).max(4000),
      chunkOverlap: z.number().int().min(0).max(1000),
      retrievalCount: z.number().int().min(1).max(20),
      minSimilarity: z.number().min(0).max(0.95),
      citationDisplay: z.enum(['inline', 'footnotes', 'hidden']),
      fallbackMessage: text(500, 10)
    }).strict().refine(v => v.chunkOverlap < v.chunkSize, { message: 'chunkOverlap must be smaller than chunkSize', path: ['chunkOverlap'] }),
    defaults: { supportedTypes: [...SOURCE_TYPES], chunkSize: 1200, chunkOverlap: 200, retrievalCount: env.MAX_CONTEXT_CHUNKS, minSimilarity: env.RETRIEVAL_MIN_SIMILARITY, citationDisplay: 'inline', fallbackMessage: FALLBACK_ANSWER }
  },
  security: {
    scope: 'admin',
    schema: z.object({
      sessionTimeoutMinutes: z.number().int().min(15).max(1440),
      restrictSourcesByRole: z.boolean(),
      readOnlyCanExport: z.boolean(),
      auditLogVisibility: z.enum(['administrators'])
    }).strict(),
    defaults: { sessionTimeoutMinutes: 60, restrictSourcesByRole: true, readOnlyCanExport: false, auditLogVisibility: 'administrators' }
  },
  domain_policy: {
    scope: 'admin',
    schema: z.object({
      enforceScope: z.boolean(),
      allowedScope: text(1000, 10),
      blockedTopics: z.array(text(60, 2)).max(50)
    }).strict(),
    defaults: {
      enforceScope: true,
      allowedScope: 'Questions about the approved knowledge base of this workspace: its videos, documents, business information, client work, sales and negotiation strategies.',
      blockedTopics: ['politics', 'elections', 'religion', 'medical advice', 'legal advice', 'weapons', 'adult content', 'gambling']
    }
  },
  chat: {
    scope: 'admin',
    schema: z.object({
      dailyQuestionLimitPerUser: z.number().int().min(1).max(5000),
      maxQuestionLength: z.number().int().min(100).max(4000)
    }).strict(),
    defaults: { dailyQuestionLimitPerUser: 200, maxQuestionLength: 2000 }
  }
};

let cache = null, cacheAt = 0;

/** All sections merged over defaults (cached for 10 s). */
export async function getSettings() {
  if (cache && Date.now() - cacheAt < 10000) return cache;
  const rows = await many(`select key, value from ${T.settings}`);
  const out = {};
  for (const [k, s] of Object.entries(SECTIONS)) {
    const saved = rows.find(r => r.key === k)?.value || {};
    out[k] = { ...s.defaults, ...saved };
  }
  cache = out; cacheAt = Date.now();
  return out;
}
export const invalidateSettings = () => { cache = null; };

/** Public subset for the client app (no admin-only sections). */
export async function getPublicSettings() {
  const s = await getSettings();
  return { platform: s.platform, knowledge: { citationDisplay: s.knowledge.citationDisplay, supportedTypes: s.knowledge.supportedTypes }, chat: { maxQuestionLength: s.chat.maxQuestionLength } };
}

/** Validate and save one section (partial changes are merged with current values). */
export async function updateSection(section, changes, actor, req) {
  const def = SECTIONS[section];
  if (!def) throw ApiError.notFound('Unknown settings section.');
  const current = (await getSettings())[section];
  const merged = { ...current, ...changes };
  const r = def.schema.safeParse(merged);
  if (!r.success) throw ApiError.validation(r.error.issues[0]?.message, r.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })));
  await one(`insert into ${T.settings} (key, value, scope, updated_by, updated_at) values ($1, $2, $3, $4, now())
             on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now() returning key`,
  [section, JSON.stringify(r.data), def.scope, actor.id]);
  invalidateSettings();
  const changed = Object.keys(changes).filter(k => JSON.stringify(current[k]) !== JSON.stringify(r.data[k]));
  await recordAudit({ actor, action: 'settings.updated', entityType: 'settings', entityId: section, entityLabel: `${section} settings`, details: { changed }, req });
  return r.data;
}

export async function resetSection(section, actor, req) {
  if (!SECTIONS[section]) throw ApiError.notFound('Unknown settings section.');
  await one(`insert into ${T.settings} (key, value, scope, updated_by) values ($1, $2, $3, $4)
             on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now() returning key`,
  [section, JSON.stringify(SECTIONS[section].defaults), SECTIONS[section].scope, actor.id]);
  invalidateSettings();
  await recordAudit({ actor, action: 'settings.reset', entityType: 'settings', entityId: section, entityLabel: `${section} settings`, req });
  return SECTIONS[section].defaults;
}
