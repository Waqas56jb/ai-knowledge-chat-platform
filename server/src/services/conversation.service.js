/**
 * Conversations. Every user-facing function checks ownership (user_id = caller) in the SQL itself, so
 * guessing another conversation's UUID returns 404. Admin review functions are separate and audited.
 */
import { one, many, query } from '../config/database.js';
import { T, REVIEW_STATUSES } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit, entityActivity } from './audit.service.js';
import { notifyAdmins } from './notification.service.js';
import { TYPE_GROUP } from './source.service.js';

export const messageOut = m => m && ({
  id: m.id, role: m.role, content: m.content, citations: m.citations || [], outcome: m.outcome, replyTo: m.reply_to,
  clientMessageId: m.client_message_id, createdAt: m.created_at, feedback: m.feedback || null,
  followups: Array.isArray(m.usage?.followups) ? m.usage.followups : []
});

/** Dashboard numbers for the signed-in user (only their own data and sources they may access). */
export async function ownOverview(user) {
  const [counts, days, recentConvs, recentSources] = await Promise.all([
    one(`select (select count(*)::int from ${T.conversations} where user_id = $1) as conversations,
                (select count(*)::int from ${T.messages} m join ${T.conversations} c on c.id = m.conversation_id where c.user_id = $1 and m.role = 'user') as questions,
                (select count(*)::int from ${T.sources} s where s.status = 'indexed' and s.id in (select public.ai_knowledge_chat_accessible_source_ids($1))) as sources`, [user.id]),
    many(`select to_char(d, 'YYYY-MM-DD') as day, coalesce(n, 0)::int as count
            from generate_series((now() at time zone 'UTC')::date - 6, (now() at time zone 'UTC')::date, interval '1 day') d
            left join (select (m.created_at at time zone 'UTC')::date as day, count(*) as n from ${T.messages} m join ${T.conversations} c on c.id = m.conversation_id
                        where c.user_id = $1 and m.role = 'user' and m.created_at > now() - interval '8 days' group by 1) x on x.day = d::date
           order by d`, [user.id]),
    many(`select c.*, ${STATS} from ${T.conversations} c where c.user_id = $1 order by c.updated_at desc limit 5`, [user.id]),
    many(`select id, title, source_type, status, created_at from ${T.sources} s where s.status = 'indexed' and coalesce(s.metadata ->> 'kind', '') <> 'channel'
            and s.id in (select public.ai_knowledge_chat_accessible_source_ids($1)) order by s.created_at desc limit 5`, [user.id])
  ]);
  return {
    counts,
    questionsLast7Days: days.map(d => ({ date: d.day, count: d.count })),
    recentConversations: recentConvs.map(conversationOut),
    recentSources: recentSources.map(s => ({ id: s.id, title: s.title, type: s.source_type, group: TYPE_GROUP[s.source_type], status: s.status, createdAt: s.created_at }))
  };
}

export const conversationOut = c => c && ({
  id: c.id, title: c.title, status: c.status, reviewStatus: c.review_status, createdAt: c.created_at, updatedAt: c.updated_at,
  messageCount: c.message_count, sourceCount: c.source_count, preview: c.preview || null, userId: c.user_id, userName: c.user_name, userEmail: c.user_email,
  lastOutcome: c.last_outcome, citationCount: c.citation_count
});

export async function assertConversationOwner(user, id) {
  const c = await one(`select * from ${T.conversations} where id = $1 and user_id = $2`, [id, user.id]);
  if (!c) throw ApiError.notFound('Conversation not found.');
  return c;
}

export async function createConversation(user, { title }) {
  return one(`insert into ${T.conversations} (user_id, title) values ($1, $2) returning *`, [user.id, (title || 'New conversation').slice(0, 200)]);
}

const STATS = `
  (select count(*)::int from ${T.messages} m where m.conversation_id = c.id) as message_count,
  (select count(distinct ci ->> 'sourceId')::int from ${T.messages} m, jsonb_array_elements(m.citations) ci where m.conversation_id = c.id) as source_count,
  (select count(*)::int from ${T.messages} m, jsonb_array_elements(m.citations) ci where m.conversation_id = c.id) as citation_count,
  (select left(m.content, 160) from ${T.messages} m where m.conversation_id = c.id order by m.created_at desc limit 1) as preview,
  (select m.outcome from ${T.messages} m where m.conversation_id = c.id and m.role = 'assistant' order by m.created_at desc limit 1) as last_outcome`;

export async function listOwnConversations(user, { q }, { limit, offset }) {
  const params = [user.id]; let w = 'where c.user_id = $1';
  if (q) { params.push(`%${q}%`); w += ` and (c.title ilike $2 or exists (select 1 from ${T.messages} m where m.conversation_id = c.id and m.content ilike $2))`; }
  const total = (await one(`select count(*)::int as n from ${T.conversations} c ${w}`, params)).n;
  const rows = await many(`select c.*, ${STATS} from ${T.conversations} c ${w} order by c.updated_at desc limit ${Number(limit)} offset ${Number(offset)}`, params);
  return { rows: rows.map(conversationOut), total };
}

async function messagesWithFeedback(convId, userId, { limit = 200, before } = {}) {
  const params = [convId, userId, limit]; let extra = '';
  if (before) { params.push(before); extra = ` and m.created_at < (select created_at from ${T.messages} where id = $4)`; }
  const rows = await many(`select * from (select m.*, f.rating as feedback from ${T.messages} m left join ${T.feedback} f on f.message_id = m.id and f.user_id = $2
      where m.conversation_id = $1${extra} order by m.created_at desc limit $3) x order by created_at asc`, params);
  return rows.map(messageOut);
}

export async function getOwnConversation(user, id, opts) {
  const c = await one(`select c.*, ${STATS} from ${T.conversations} c where c.id = $1 and c.user_id = $2`, [id, user.id]);
  if (!c) throw ApiError.notFound('Conversation not found.');
  return { ...conversationOut(c), messages: await messagesWithFeedback(id, user.id, opts) };
}

export async function listOwnMessages(user, id, { limit, before }) {
  await assertConversationOwner(user, id);
  return messagesWithFeedback(id, user.id, { limit, before });
}

export async function renameConversation(user, id, title) {
  const c = await one(`update ${T.conversations} set title = $3, updated_at = now() where id = $1 and user_id = $2 returning *`, [id, user.id, title]);
  if (!c) throw ApiError.notFound('Conversation not found.');
  return conversationOut(c);
}

export async function deleteConversation(user, id) {
  const r = await one(`delete from ${T.conversations} where id = $1 and user_id = $2 returning id`, [id, user.id]);
  if (!r) throw ApiError.notFound('Conversation not found.');
}

/** Delete all of the caller's conversations (privacy control in the client settings). */
export async function deleteAllOwnConversations(user) {
  const r = await query(`delete from ${T.conversations} where user_id = $1`, [user.id]);
  return r.rowCount;
}

/** One feedback per user and assistant message (upsert); null rating removes it. */
export async function setFeedback(user, messageId, { rating, comment = '' }) {
  const m = await one(`select m.id, m.role from ${T.messages} m join ${T.conversations} c on c.id = m.conversation_id where m.id = $1 and c.user_id = $2`, [messageId, user.id]);
  if (!m) throw ApiError.notFound('Message not found.');
  if (m.role !== 'assistant') throw ApiError.validation('Feedback can only be given on assistant answers.');
  if (!rating) { await query(`delete from ${T.feedback} where message_id = $1 and user_id = $2`, [messageId, user.id]); return null; }
  return one(`insert into ${T.feedback} (message_id, user_id, rating, comment) values ($1, $2, $3, $4)
              on conflict (message_id, user_id) do update set rating = excluded.rating, comment = excluded.comment, created_at = now() returning rating, comment`, [messageId, user.id, rating, comment]);
}

/* ------------------------------- admin ------------------------------- */

const RANGE = { '7d': 7, '30d': 30, '90d': 90 };

export async function adminListConversations(f, { limit, offset }) {
  const params = []; const where = [];
  if (f.q) { params.push(`%${f.q}%`); where.push(`(c.title ilike $${params.length} or p.full_name ilike $${params.length} or p.email ilike $${params.length})`); }
  if (f.userId) { params.push(f.userId); where.push(`c.user_id = $${params.length}`); }
  if (f.review) {
    if (f.review === 'flagged') where.push(`c.review_status in ('needs_attention','unsupported','source_mismatch')`);
    else { params.push(f.review); where.push(`c.review_status = $${params.length}`); }
  }
  if (f.range && RANGE[f.range]) where.push(`c.updated_at >= now() - interval '${RANGE[f.range]} days'`);
  if (f.outcome) { params.push(f.outcome); where.push(`exists (select 1 from ${T.messages} m where m.conversation_id = c.id and m.role = 'assistant' and m.outcome = $${params.length})`); }
  if (f.sourceGroup) {
    const types = Object.entries(TYPE_GROUP).filter(([, g]) => g === f.sourceGroup).map(([t]) => t);
    params.push(types);
    where.push(`exists (select 1 from ${T.messages} m, jsonb_array_elements(m.citations) ci where m.conversation_id = c.id and ci ->> 'sourceType' = any($${params.length}::text[]))`);
  }
  const w = where.length ? `where ${where.join(' and ')}` : '';
  const from = `${T.conversations} c left join ${T.profiles} p on p.id = c.user_id`;
  const total = (await one(`select count(*)::int as n from ${from} ${w}`, params)).n;
  const sort = { title: 'c.title', createdAt: 'c.created_at', updatedAt: 'c.updated_at' }[f.sort] || 'c.updated_at';
  const rows = await many(`select c.*, p.full_name as user_name, p.email as user_email, ${STATS} from ${from} ${w}
     order by ${sort} ${f.dir === 'asc' ? 'asc' : 'desc'} limit ${Number(limit)} offset ${Number(offset)}`, params);
  return { rows: rows.map(conversationOut), total };
}

export async function adminConversationStats() {
  return one(`select count(*)::int as total, count(*) filter (where review_status in ('needs_attention','unsupported','source_mismatch'))::int as needs_review,
      count(*) filter (where review_status = 'unreviewed')::int as unreviewed from ${T.conversations}`);
}

/** Administrative inspection. Every view is written to the audit log. */
export async function adminGetConversation(id, actor, req) {
  const c = await one(`select c.*, p.full_name as user_name, p.email as user_email, p.role as user_role, p.status as user_status, ${STATS}
     from ${T.conversations} c left join ${T.profiles} p on p.id = c.user_id where c.id = $1`, [id]);
  if (!c) throw ApiError.notFound('Conversation not found.');
  const [messages, notes, feedback] = await Promise.all([
    many(`select m.* from ${T.messages} m where m.conversation_id = $1 order by m.created_at asc`, [id]),
    many(`select n.id, n.note, n.created_at, n.author_id, p.full_name as author_name from ${T.reviewNotes} n left join ${T.profiles} p on p.id = n.author_id where n.conversation_id = $1 order by n.created_at`, [id]),
    many(`select f.message_id, f.rating, f.comment from ${T.feedback} f join ${T.messages} m on m.id = f.message_id where m.conversation_id = $1`, [id])
  ]);
  const sourceIds = [...new Set(messages.flatMap(m => (m.citations || []).map(ci => ci.sourceId)))];
  const sources = sourceIds.length ? await many(`select id, title, source_type, status from ${T.sources} where id = any($1::uuid[])`, [sourceIds]) : [];
  await recordAudit({ actor, action: 'conversation.viewed', entityType: 'conversation', entityId: id, entityLabel: c.title, details: { ownerId: c.user_id }, req });
  return {
    ...conversationOut(c),
    user: c.user_id ? { id: c.user_id, name: c.user_name, email: c.user_email, role: c.user_role, status: c.user_status } : null,
    messages: messages.map(m => ({ ...messageOut(m), feedback: feedback.find(f => f.message_id === m.id) || null })),
    sources: sources.map(s => ({ id: s.id, title: s.title, type: s.source_type, status: s.status })),
    reviewNotes: notes.map(n => ({ id: n.id, note: n.note, createdAt: n.created_at, authorId: n.author_id, authorName: n.author_name })),
    activity: await entityActivity('conversation', id)
  };
}

/** { status?, note? } */
export async function adminReviewConversation(id, { status, note }, actor, req) {
  const c = await one(`select id, title, review_status from ${T.conversations} where id = $1`, [id]);
  if (!c) throw ApiError.notFound('Conversation not found.');
  if (status) {
    if (!REVIEW_STATUSES.includes(status)) throw ApiError.validation('Unknown review status.');
    await query(`update ${T.conversations} set review_status = $2 where id = $1`, [id, status]);
    await recordAudit({ actor, action: 'conversation.reviewed', entityType: 'conversation', entityId: id, entityLabel: c.title, details: { from: c.review_status, to: status }, req });
    if (['needs_attention', 'unsupported', 'source_mismatch'].includes(status) && status !== c.review_status) {
      await notifyAdmins({ type: 'conversation', title: 'Conversation flagged', message: `"${c.title}" was marked ${status.replace(/_/g, ' ')}.`, link: `/admin/conversations/${id}` });
    }
  }
  if (note) {
    await query(`insert into ${T.reviewNotes} (conversation_id, author_id, note) values ($1, $2, $3)`, [id, actor.id, note]);
    await recordAudit({ actor, action: 'conversation.note_added', entityType: 'conversation', entityId: id, entityLabel: c.title, req });
  }
  return adminGetConversation(id, actor, req);
}
