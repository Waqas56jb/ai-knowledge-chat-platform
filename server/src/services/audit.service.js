/** Append-only audit trail (UPDATE/DELETE are blocked by a database trigger). */
import { query, many, one } from '../config/database.js';
import { T } from '../config/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Record a privileged action. Never throws (an audit failure must not break the request) but logs.
 * Pass `db` (a transaction client) to write inside the same transaction.
 */
export async function recordAudit({ actor, action, entityType, entityId = null, entityLabel = null, details = {}, result = 'success', req }, db) {
  const sql = `insert into ${T.audit} (actor_id, actor_email, action, entity_type, entity_id, entity_label, details, result, request_id, ip)
               values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
  const params = [actor?.id || null, actor?.email || null, action, entityType, entityId == null ? null : String(entityId), entityLabel, JSON.stringify(details || {}), result, req?.id || null, req?.ip || null];
  try { await (db || { query }).query(sql, params); } catch (e) { logger.error({ action, err: { code: e.code, message: e.message } }, 'audit write failed'); if (db) throw e; }
}

const FILTERS = (f, params) => {
  const where = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  if (f.q) {
    params.push(`%${f.q}%`);
    const i = params.length;
    where.push(`(a.action ilike $${i} or a.entity_label ilike $${i} or a.entity_id ilike $${i} or a.actor_email ilike $${i} or a.details::text ilike $${i})`);
  }
  if (f.actorId) add('a.actor_id = ?', f.actorId);
  if (f.action) add('a.action = ?', f.action);
  if (f.entityType) add('a.entity_type = ?', f.entityType);
  if (f.entityId) add('a.entity_id = ?', f.entityId);
  if (f.result) add('a.result = ?', f.result);
  if (f.from) add('a.created_at >= ?', f.from);
  if (f.to) add("a.created_at < (?::date + interval '1 day')", f.to);
  return where.length ? `where ${where.join(' and ')}` : '';
};

export async function listAudit(f, { limit, offset }) {
  const params = [];
  const where = FILTERS(f, params);
  const total = (await one(`select count(*)::int as n from ${T.audit} a ${where}`, params)).n;
  const rows = await many(
    `select a.*, p.full_name as actor_name from ${T.audit} a left join ${T.profiles} p on p.id = a.actor_id ${where}
     order by a.created_at desc limit ${Number(limit)} offset ${Number(offset)}`, params);
  return { rows, total };
}

export const getAudit = id => one(`select a.*, p.full_name as actor_name from ${T.audit} a left join ${T.profiles} p on p.id = a.actor_id where a.id = $1`, [id]);

export const listActors = () => many(`select distinct a.actor_id as id, coalesce(p.full_name, a.actor_email, 'System') as name from ${T.audit} a left join ${T.profiles} p on p.id = a.actor_id order by 2`);

export const entityActivity = (entityType, entityId, limit = 50) =>
  many(`select a.*, p.full_name as actor_name from ${T.audit} a left join ${T.profiles} p on p.id = a.actor_id where a.entity_type = $1 and a.entity_id = $2 order by a.created_at desc limit $3`, [entityType, String(entityId), limit]);
