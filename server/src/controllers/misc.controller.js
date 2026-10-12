import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { one } from '../config/database.js';
import { REQUIRED_MIGRATIONS } from '../config/constants.js';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';
import * as notifications from '../services/notification.service.js';
import { ApiError } from '../utils/ApiError.js';

export const health = (_req, res) => ok(res, { status: 'ok', service: 'nexus-ai-server', time: new Date().toISOString() });

/** Readiness: verifies configuration and dependencies without exposing secret values. */
export const ready = asyncHandler(async (_req, res) => {
  const checks = {};
  const t0 = Date.now();
  try { await one('select 1 as ok'); checks.database = { ok: true, ms: Date.now() - t0 }; } catch { checks.database = { ok: false }; }
  try {
    const r = await one(`select count(*)::int as n from public.ai_knowledge_chat_schema_migrations`);
    checks.migrations = { ok: r.n >= REQUIRED_MIGRATIONS, applied: r.n };
  } catch { checks.migrations = { ok: false }; }
  try {
    const t1 = Date.now();
    const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    checks.auth = { ok: !error, ms: Date.now() - t1 };
  } catch { checks.auth = { ok: false }; }
  checks.openai = { ok: !!env.OPENAI_API_KEY, configured: !!env.OPENAI_API_KEY, chatModel: env.OPENAI_CHAT_MODEL, embeddingModel: env.OPENAI_EMBEDDING_MODEL };
  const allOk = Object.values(checks).every(c => c.ok);
  res.status(allOk ? 200 : 503).json({ success: allOk, data: { status: allOk ? 'ready' : 'degraded', checks } });
});

export const listNotifications = asyncHandler(async (req, res) => {
  const { rows, unread } = await notifications.listNotifications(req.user.id, { unreadOnly: req.validQuery.unread === 'true' });
  ok(res, rows, { unread });
});
export const readNotification = asyncHandler(async (req, res) => {
  const r = await notifications.markRead(req.user.id, req.params.id);
  if (!r) throw ApiError.notFound('Notification not found.');
  ok(res, r);
});
export const readAllNotifications = asyncHandler(async (req, res) => ok(res, { updated: await notifications.markAllRead(req.user.id) }));
