import { query, many, one } from '../config/database.js';
import { T } from '../config/constants.js';
import { logger } from '../utils/logger.js';

/** Notify every active administrator (best effort). */
export async function notifyAdmins({ type, title, message, link = null, metadata = {} }, db) {
  try {
    await (db || { query }).query(
      `insert into ${T.notifications} (user_id, type, title, message, link, metadata)
       select id, $1, $2, $3, $4, $5 from ${T.profiles} where role = 'admin' and status = 'active'`,
      [type, title, message, link, JSON.stringify(metadata)]);
  } catch (e) { logger.warn({ err: { code: e.code, message: e.message } }, 'notifyAdmins failed'); }
}

export async function notifyUser(userId, { type, title, message, link = null, metadata = {} }) {
  await query(`insert into ${T.notifications} (user_id, type, title, message, link, metadata) values ($1,$2,$3,$4,$5,$6)`, [userId, type, title, message, link, JSON.stringify(metadata)]);
}

export async function listNotifications(userId, { unreadOnly = false, limit = 50 } = {}) {
  const rows = await many(`select id, type, title, message, link, metadata, read_at, created_at from ${T.notifications}
     where user_id = $1 ${unreadOnly ? 'and read_at is null' : ''} order by created_at desc limit $2`, [userId, limit]);
  const { n } = await one(`select count(*)::int as n from ${T.notifications} where user_id = $1 and read_at is null`, [userId]);
  return { rows, unread: n };
}

/** Ownership enforced: only the recipient can mark it read. */
export async function markRead(userId, id) {
  const r = await one(`update ${T.notifications} set read_at = coalesce(read_at, now()) where id = $1 and user_id = $2 returning id, read_at`, [id, userId]);
  return r;
}
export async function markAllRead(userId) {
  const r = await query(`update ${T.notifications} set read_at = now() where user_id = $1 and read_at is null`, [userId]);
  return r.rowCount;
}
