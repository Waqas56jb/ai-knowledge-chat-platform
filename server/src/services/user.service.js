/**
 * User management. Admin-only operations are guarded in routes (requireAdmin) AND re-checked here
 * for invariants: no self-lockout, never remove the last active administrator.
 * Suspension/revocation is also enforced at the Supabase Auth level (ban), so tokens cannot be refreshed.
 */
import { one, many, tx } from '../config/database.js';
import { T, FN } from '../config/constants.js';
import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit, entityActivity } from './audit.service.js';
import { logger } from '../utils/logger.js';
import { getInsight } from './insight.service.js';

const SORTS = { name: 'x.full_name', email: 'x.email', createdAt: 'x.created_at', lastActiveAt: 'x.last_active_at', conversationCount: 'x.conversation_count', role: 'x.role', status: 'x.status',
  businessName: 'lower(x.business_name)', country: 'lower(x.country)', stage: 'x.business_stage' };

const USER_SELECT = `
  select p.id, p.email, p.full_name, p.role, p.status, p.department, p.notes, p.source_access, p.avatar_url,
         p.timezone, p.language, p.created_at, p.updated_at, p.last_active_at,
         (select count(*)::int from ${T.conversations} c where c.user_id = p.id) as conversation_count,
         (select count(*)::int from ${T.messages} m join ${T.conversations} c on c.id = m.conversation_id where c.user_id = p.id and m.role = 'user') as questions_asked,
         i.business_name, i.business_type, i.user_role, i.city, i.state, i.country, i.business_stage, i.products, i.client_types, i.generated_at as profile_generated_at
  from ${T.profiles} p
  left join ${T.insights} i on i.user_id = p.id`;

export const userOut = u => u && ({
  id: u.id, email: u.email, name: u.full_name, fullName: u.full_name, role: u.role, status: u.status, department: u.department, notes: u.notes,
  sourceAccess: u.source_access, avatarUrl: u.avatar_url, timezone: u.timezone, language: u.language,
  createdAt: u.created_at, updatedAt: u.updated_at, lastActiveAt: u.last_active_at,
  conversationCount: u.conversation_count ?? 0, questionsAsked: u.questions_asked ?? 0,
  // hidden business profile (admin-only API)
  business: {
    name: u.business_name || null, type: u.business_type || null, role: u.user_role || null,
    city: u.city || null, state: u.state || null, country: u.country || null, stage: u.business_stage || null,
    products: u.products || [], clientTypes: u.client_types || [], updatedAt: u.profile_generated_at || null
  }
});

export async function listUsers({ q, status, role, country, state, city, businessType, stage, product, clientType, hasProfile, sort = 'createdAt', dir = 'desc' }, { limit, offset }) {
  const params = []; const where = [];
  if (q) { params.push(`%${q}%`); where.push(`(p.full_name ilike $${params.length} or p.email ilike $${params.length} or p.department ilike $${params.length} or i.business_name ilike $${params.length})`); }
  for (const [col, v] of [['i.country', country], ['i.state', state], ['i.city', city], ['i.business_type', businessType]]) {
    if (v) { params.push(v.trim().toLowerCase()); where.push(`lower(${col}) = $${params.length}`); }
  }
  if (stage) { params.push(stage); where.push(`i.business_stage = $${params.length}`); }
  if (product) { params.push(product.trim().toLowerCase()); where.push(`$${params.length} = any(i.products)`); }
  if (clientType) { params.push(clientType.trim().toLowerCase()); where.push(`$${params.length} = any(i.client_types)`); }
  // a profile exists when the AI has built it or an admin has entered any field
  const HAS = '(i.generated_at is not null or cardinality(i.manual_fields) > 0)';
  if (hasProfile === 'true') where.push(HAS);
  if (hasProfile === 'false') where.push(`not coalesce(${HAS}, false)`);
  if (status) { params.push(status); where.push(`p.status = $${params.length}`); }
  if (role) { params.push(role); where.push(`p.role = $${params.length}`); }
  const w = where.length ? `where ${where.join(' and ')}` : '';
  const total = (await one(`select count(*)::int as n from ${T.profiles} p left join ${T.insights} i on i.user_id = p.id ${w}`, params)).n;
  const order = `${SORTS[sort] || 'x.created_at'} ${dir === 'asc' ? 'asc' : 'desc'} nulls last, x.id`;
  const rows = await many(`select * from (${USER_SELECT} ${w}) x order by ${order} limit ${Number(limit)} offset ${Number(offset)}`, params);
  return { rows: rows.map(userOut), total };
}

export async function userStats() {
  return one(`select count(*)::int as total,
      count(*) filter (where status = 'active')::int as active,
      count(*) filter (where status = 'suspended')::int as suspended,
      count(*) filter (where status = 'revoked')::int as revoked,
      (select count(*)::int from ${T.invitations} where accepted_at is null and revoked_at is null and expires_at > now()) as pending_invitations
    from ${T.profiles}`);
}

export async function getUser(id) {
  const u = await one(`${USER_SELECT} where p.id = $1`, [id]);
  if (!u) throw ApiError.notFound('User not found.');
  const [conversations, invitations, sources, allowed, activity, businessProfile] = await Promise.all([
    many(`select c.id, c.title, c.review_status, c.created_at, c.updated_at,
            (select count(*)::int from ${T.messages} m where m.conversation_id = c.id) as message_count,
            (select m.outcome from ${T.messages} m where m.conversation_id = c.id and m.role = 'assistant' order by m.created_at desc limit 1) as last_outcome
          from ${T.conversations} c where c.user_id = $1 order by c.updated_at desc limit 100`, [id]),
    many(`select id, email, role, created_at, expires_at, accepted_at, revoked_at, token_hint from ${T.invitations} where lower(email) = lower($1) order by created_at desc`, [u.email]),
    many(`select s.id, s.title, s.source_type, s.status, s.visibility from ${T.sources} s where s.id in (select ${FN.accessibleSources}($1)) order by s.title limit 500`, [id]),
    many(`select source_id from ${T.sourceAccess} where user_id = $1`, [id]),
    entityActivity('user', id),
    getInsight(id)
  ]);
  return {
    ...userOut(u),
    allowedSourceIds: allowed.map(a => a.source_id),
    businessProfile: businessProfile || null,
    conversations: conversations.map(c => ({ id: c.id, title: c.title, reviewStatus: c.review_status, createdAt: c.created_at, updatedAt: c.updated_at, messageCount: c.message_count, outcome: c.last_outcome })),
    invitations: invitations.map(i => ({ id: i.id, email: i.email, role: i.role, createdAt: i.created_at, expiresAt: i.expires_at, acceptedAt: i.accepted_at, revokedAt: i.revoked_at, codeHint: i.token_hint, status: i.revoked_at ? 'revoked' : i.accepted_at ? 'accepted' : new Date(i.expires_at) < new Date() ? 'expired' : 'pending' })),
    accessibleSources: sources.map(s => ({ id: s.id, title: s.title, type: s.source_type, status: s.status, visibility: s.visibility })),
    activity
  };
}

async function assertNotLastAdmin(db, userId) {
  const r = (await db.query(`select count(*)::int as n from ${T.profiles} where role = 'admin' and status = 'active' and id <> $1`, [userId])).rows[0];
  if (r.n === 0) throw ApiError.conflict('At least one active administrator must remain.');
}

async function setAuthBan(userId, banned) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: banned ? '876000h' : 'none' });
  if (error) { logger.error({ code: error.code }, 'auth ban update failed'); throw ApiError.unavailable('Could not update the account in the authentication service.'); }
}

/**
 * changes: { fullName, email, role, status, department, notes, sourceAccess, allowedSourceIds }
 */
export async function updateUser(id, changes, actor, req) {
  const before = await one(`select * from ${T.profiles} where id = $1`, [id]);
  if (!before) throw ApiError.notFound('User not found.');
  const selfEdit = id === actor.id;
  if (selfEdit && changes.role && changes.role !== before.role) throw ApiError.forbidden('You cannot change your own role.');
  if (selfEdit && changes.status && changes.status !== before.status) throw ApiError.forbidden('You cannot change your own account status.');

  const demoting = before.role === 'admin' && ((changes.role && changes.role !== 'admin') || (changes.status && changes.status !== 'active'));

  if (changes.email && changes.email.toLowerCase() !== before.email.toLowerCase()) {
    const taken = await one(`select 1 from ${T.profiles} where lower(email) = lower($1) and id <> $2`, [changes.email, id]);
    if (taken) throw ApiError.conflict('Another user already uses this email address.');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { email: changes.email, email_confirm: true });
    if (error) throw ApiError.conflict('The email could not be changed in the authentication service (it may already be registered).');
  }

  const updated = await tx(async db => {
    if (demoting) await assertNotLastAdmin(db, id);
    const map = { fullName: 'full_name', email: 'email', role: 'role', status: 'status', department: 'department', notes: 'notes', sourceAccess: 'source_access' };
    const sets = []; const params = [id];
    for (const [k, col] of Object.entries(map)) if (changes[k] !== undefined) { params.push(changes[k]); sets.push(`${col} = $${params.length}`); }
    if (sets.length) await db.query(`update ${T.profiles} set ${sets.join(', ')} where id = $1`, params);
    if (Array.isArray(changes.allowedSourceIds)) {
      await db.query(`delete from ${T.sourceAccess} where user_id = $1`, [id]);
      if (changes.allowedSourceIds.length) {
        await db.query(`insert into ${T.sourceAccess} (source_id, user_id) select s.id, $1 from ${T.sources} s where s.id = any($2::uuid[]) on conflict do nothing`, [id, changes.allowedSourceIds]);
      }
    }
    const changed = Object.keys(changes).filter(k => k === 'allowedSourceIds' || (map[k] && String(before[map[k]]) !== String(changes[k])));
    if (changes.role && changes.role !== before.role) {
      await recordAudit({ actor, action: 'user.role_changed', entityType: 'user', entityId: id, entityLabel: before.email, details: { from: before.role, to: changes.role }, req }, db);
    }
    if (changes.status && changes.status !== before.status) {
      const action = { active: 'user.reactivated', suspended: 'user.suspended', revoked: 'user.revoked', pending: 'user.updated' }[changes.status];
      await recordAudit({ actor, action, entityType: 'user', entityId: id, entityLabel: before.email, details: { from: before.status, to: changes.status }, req }, db);
    }
    const other = changed.filter(k => k !== 'role' && k !== 'status');
    if (other.length) await recordAudit({ actor, action: 'user.updated', entityType: 'user', entityId: id, entityLabel: before.email, details: { changed: other }, req }, db);
    return true;
  });

  if (changes.status && changes.status !== before.status) {
    const nowBlocked = ['suspended', 'revoked'].includes(changes.status);
    const wasBlocked = ['suspended', 'revoked'].includes(before.status);
    if (nowBlocked !== wasBlocked) await setAuthBan(id, nowBlocked);
  }
  return updated && getUser(id);
}

export const setStatus = (id, status, actor, req) => updateUser(id, { status }, actor, req);

/**
 * Delete policy: the Supabase Auth user is deleted; the profile and the user's conversations,
 * messages, feedback and notifications cascade. Sources they created stay (owner set to NULL),
 * audit history stays (actor_id kept as an opaque id).
 */
export async function deleteUser(id, actor, req) {
  if (id === actor.id) throw ApiError.forbidden('You cannot delete your own account.');
  const u = await one(`select id, email, role, status from ${T.profiles} where id = $1`, [id]);
  if (!u) throw ApiError.notFound('User not found.');
  if (u.role === 'admin' && u.status === 'active') await tx(db => assertNotLastAdmin(db, id));
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error && !/not.?found/i.test(error.message || '')) throw ApiError.unavailable('The account could not be deleted from the authentication service.');
  // if the auth user was already gone, remove the orphaned profile explicitly
  await one(`delete from ${T.profiles} where id = $1 returning id`, [id]);
  await recordAudit({ actor, action: 'user.deleted', entityType: 'user', entityId: id, entityLabel: u.email, details: { role: u.role }, req });
}

/** Self-service profile update (role/status/email are NOT accepted here). */
export async function updateOwnProfile(user, changes, req) {
  const map = { fullName: 'full_name', department: 'department', timezone: 'timezone', language: 'language', avatarUrl: 'avatar_url', preferences: 'preferences' };
  const sets = []; const params = [user.id];
  for (const [k, col] of Object.entries(map)) if (changes[k] !== undefined) { params.push(k === 'preferences' ? JSON.stringify(changes[k]) : changes[k]); sets.push(`${col} = $${params.length}`); }
  if (!sets.length) return user;
  const row = await one(`update ${T.profiles} set ${sets.join(', ')} where id = $1 returning *`, params);
  await recordAudit({ actor: user, action: 'profile.updated', entityType: 'user', entityId: user.id, entityLabel: user.email, details: { changed: Object.keys(changes) }, req });
  return row;
}
