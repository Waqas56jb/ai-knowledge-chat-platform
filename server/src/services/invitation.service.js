/**
 * Invitations. A cryptographically random token is generated and returned to the admin exactly
 * once (on create/resend); only its SHA-256 hash is stored. Resend ROTATES the token (the old link
 * stops working). No email is sent by this service: the admin shares the link (see README).
 */
import { one, many, tx } from '../config/database.js';
import { T } from '../config/constants.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { newToken } from '../utils/sanitize.js';
import { recordAudit } from './audit.service.js';
import { getSettings } from './settings.service.js';

export const inviteUrl = raw => `${env.CLIENT_URL}/register?invite=${encodeURIComponent(raw)}`;

const STATUS_SQL = `case when i.revoked_at is not null then 'revoked' when i.accepted_at is not null then 'accepted' when i.expires_at <= now() then 'expired' else 'pending' end`;

export const invitationOut = (i, raw) => i && ({
  id: i.id, email: i.email, role: i.role, status: i.status, codeHint: i.token_hint,
  invitedBy: i.invited_by, invitedByName: i.invited_by_name || null, message: i.message, note: i.note,
  createdAt: i.created_at, expiresAt: i.expires_at, acceptedAt: i.accepted_at, acceptedBy: i.accepted_by, revokedAt: i.revoked_at,
  resendCount: i.resend_count, lastSentAt: i.last_sent_at,
  ...(raw ? { token: raw, url: inviteUrl(raw), delivery: 'manual' } : {})
});

const SELECT = `select i.*, ${STATUS_SQL} as status, p.full_name as invited_by_name from ${T.invitations} i left join ${T.profiles} p on p.id = i.invited_by`;

export async function listInvitations({ q, status }, { limit, offset }) {
  const params = []; const where = [];
  if (q) { params.push(`%${q}%`); where.push(`i.email ilike $${params.length}`); }
  if (status) { params.push(status); where.push(`(${STATUS_SQL}) = $${params.length}`); }
  const w = where.length ? `where ${where.join(' and ')}` : '';
  const total = (await one(`select count(*)::int as n from ${T.invitations} i ${w}`, params)).n;
  const rows = await many(`${SELECT} ${w} order by i.created_at desc limit ${Number(limit)} offset ${Number(offset)}`, params);
  return { rows: rows.map(r => invitationOut(r)), total };
}

export async function invitationStats() {
  return one(`select count(*)::int as total,
      count(*) filter (where s = 'pending')::int as pending, count(*) filter (where s = 'accepted')::int as accepted,
      count(*) filter (where s = 'expired')::int as expired, count(*) filter (where s = 'revoked')::int as revoked
    from (select ${STATUS_SQL} as s from ${T.invitations} i) x`);
}

export async function getInvitation(id) {
  const r = await one(`${SELECT} where i.id = $1`, [id]);
  if (!r) throw ApiError.notFound('Invitation not found.');
  return invitationOut(r);
}

/** payload: { email, role, expiresInDays?, message?, note? } */
export async function createInvitation(payload, actor, req) {
  const email = payload.email.trim().toLowerCase();
  const days = payload.expiresInDays || (await getSettings()).platform.defaultInvitationExpiryDays || Math.round(env.INVITATION_EXPIRY_HOURS / 24);
  const existing = await one(`select status from ${T.profiles} where lower(email) = $1`, [email]);
  if (existing) throw ApiError.conflict('This email already belongs to a user of this workspace.');
  const t = newToken();
  const row = await tx(async db => {
    // close stale open invitations for this email (expired ones) so the unique "open per email" index allows a new one
    await db.query(`update ${T.invitations} set revoked_at = now() where lower(email) = $1 and accepted_at is null and revoked_at is null and expires_at <= now()`, [email]);
    const open = (await db.query(`select id from ${T.invitations} where lower(email) = $1 and accepted_at is null and revoked_at is null`, [email])).rows[0];
    if (open) throw ApiError.conflict('A pending invitation already exists for this email. Resend or revoke it instead.');
    const r = (await db.query(
      `insert into ${T.invitations} (email, role, token_hash, token_hint, invited_by, message, note, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7, now() + ($8 || ' days')::interval) returning *, 'pending' as status`,
      [email, payload.role, t.hash, t.hint, actor.id, payload.message || '', payload.note || '', String(days)])).rows[0];
    await recordAudit({ actor, action: 'invitation.created', entityType: 'invitation', entityId: r.id, entityLabel: email, details: { role: payload.role, expiresInDays: days }, req }, db);
    return r;
  });
  return invitationOut({ ...row, invited_by_name: actor.full_name }, t.raw);
}

/** Rotate the token and extend the expiry. Only for not-yet-accepted, not-revoked invitations. */
export async function resendInvitation(id, actor, req, expiresInDays) {
  const inv = await one(`${SELECT} where i.id = $1`, [id]);
  if (!inv) throw ApiError.notFound('Invitation not found.');
  if (inv.status === 'accepted' || inv.status === 'revoked') throw ApiError.conflict(`An ${inv.status} invitation cannot be resent.`);
  const days = expiresInDays || (await getSettings()).platform.defaultInvitationExpiryDays;
  const t = newToken();
  const row = await one(
    `update ${T.invitations} set token_hash = $2, token_hint = $3, expires_at = now() + ($4 || ' days')::interval,
            resend_count = resend_count + 1, last_sent_at = now()
     where id = $1 and accepted_at is null and revoked_at is null returning *, 'pending' as status`, [id, t.hash, t.hint, String(days)]);
  if (!row) throw ApiError.conflict('The invitation changed state. Refresh and try again.');
  await recordAudit({ actor, action: 'invitation.resent', entityType: 'invitation', entityId: id, entityLabel: inv.email, details: { tokenRotated: true, expiresInDays: days }, req });
  return invitationOut({ ...row, invited_by_name: inv.invited_by_name }, t.raw);
}

export async function revokeInvitation(id, actor, req) {
  const row = await one(`update ${T.invitations} set revoked_at = now() where id = $1 and accepted_at is null and revoked_at is null returning *, 'revoked' as status`, [id]);
  if (!row) {
    const exists = await one(`select 1 from ${T.invitations} where id = $1`, [id]);
    throw exists ? ApiError.conflict('Only pending or expired invitations can be revoked.') : ApiError.notFound('Invitation not found.');
  }
  await recordAudit({ actor, action: 'invitation.revoked', entityType: 'invitation', entityId: id, entityLabel: row.email, req });
  return invitationOut(row);
}
