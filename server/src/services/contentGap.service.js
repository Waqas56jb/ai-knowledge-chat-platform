/**
 * Content gaps: questions users asked that the knowledge base could not answer: assistant outcome
 * 'insufficient_evidence', or 'out_of_scope' when the MODEL judged it so (policy refusals such as prompt injection,
 * secret requests or blocked topics carry usage.scope and are excluded). Questions are grouped by a normalised key (case, punctuation and spacing ignored),
 * so the same question asked by several people appears once with a count. Admins triage each group
 * (open → planned → covered, or dismissed) so new content can be created for it.
 *
 * The questions are always derived from the messages table, so a question disappears when its conversation is
 * deleted by the user; only the triage state lives in ai_knowledge_chat_content_gaps.
 */
import { one, many, query } from '../config/database.js';
import { T } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from './audit.service.js';

/** Grouping key: lower-case, with punctuation and repeated spaces removed. */
const KEY_SQL = `btrim(lower(regexp_replace(u.content, '[^[:alnum:]]+', ' ', 'g')))`;

/* One row per user question that got a definitive reply; outcome is 'answered' or 'unanswered'. */
const QUESTIONS = `
  select u.id as message_id, u.content, u.created_at, c.id as conversation_id, c.user_id,
         case when a.outcome = 'answered' then 'answered' else 'unanswered' end as outcome, ${KEY_SQL} as key
    from ${T.messages} u
    join ${T.messages} a on a.reply_to = u.id and a.role = 'assistant'
    join ${T.conversations} c on c.id = u.conversation_id
   where u.role = 'user'
     and (a.outcome in ('insufficient_evidence', 'answered') or (a.outcome = 'out_of_scope' and a.usage ->> 'scope' is null))`;

/* Unanswered groups with counts, plus when the same question was last answered (after content was added). */
const GROUPS = `
  with q as (${QUESTIONS}),
  g as (
    select key,
           count(*) filter (where outcome = 'unanswered')::int as ask_count,
           count(distinct user_id) filter (where outcome = 'unanswered')::int as user_count,
           min(created_at) filter (where outcome = 'unanswered') as first_asked_at,
           max(created_at) filter (where outcome = 'unanswered') as last_asked_at,
           max(created_at) filter (where outcome = 'answered') as last_answered_at,
           (array_agg(content order by created_at desc) filter (where outcome = 'unanswered'))[1] as question
      from q where key <> ''
     group by key
    having count(*) filter (where outcome = 'unanswered') > 0
  )
  select g.*, md5(g.key) as id, coalesce(s.status, 'open') as status, s.note, s.updated_at as triaged_at,
         s.updated_by, p.full_name as updated_by_name
    from g
    left join ${T.contentGaps} s on s.question_key = g.key
    left join ${T.profiles} p on p.id = s.updated_by`;

const SORT = { lastAskedAt: 'last_asked_at', askCount: 'ask_count', firstAskedAt: 'first_asked_at', userCount: 'user_count', question: 'question' };

const gapOut = r => ({
  id: r.id, question: r.question, status: r.status, note: r.note || null,
  askCount: r.ask_count, userCount: r.user_count, firstAskedAt: r.first_asked_at, lastAskedAt: r.last_asked_at,
  lastAnsweredAt: r.last_answered_at || null,
  // the same question has been answered since it last failed — new content probably covers it now
  answeredSince: !!(r.last_answered_at && new Date(r.last_answered_at) > new Date(r.last_asked_at)),
  // marked covered, but people still get no answer afterwards
  askedAgainAfterCovered: r.status === 'covered' && !!r.triaged_at && new Date(r.last_asked_at) > new Date(r.triaged_at),
  triagedAt: r.triaged_at || null, updatedById: r.updated_by || null, updatedByName: r.updated_by_name || null
});

/** filters: { q, status ('open'|'planned'|'covered'|'dismissed'|'all'), range ('7d'|'30d'|'90d'), sort, dir } */
export async function listGaps(f, { limit, offset }) {
  const where = []; const params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  if (f.q) add(`question ilike ?`, `%${f.q.replace(/[%_\\]/g, m => `\\${m}`)}%`);
  if (f.status && f.status !== 'all') add(`status = ?`, f.status);
  if (f.range) add(`last_asked_at >= now() - ?::interval`, `${parseInt(f.range, 10)} days`);
  const w = where.length ? `where ${where.join(' and ')}` : '';
  const order = `${SORT[f.sort] || 'last_asked_at'} ${f.dir === 'asc' ? 'asc' : 'desc'} nulls last, key`;
  params.push(limit, offset);
  const rows = await many(`with x as (${GROUPS}) select *, count(*) over ()::int as total from x ${w} order by ${order} limit $${params.length - 1} offset $${params.length}`, params);
  return { rows: rows.map(gapOut), total: rows[0]?.total || 0 };
}

export async function gapStats() {
  const r = await one(`with x as (${GROUPS}) select
      count(*)::int as total,
      count(*) filter (where status = 'open')::int as open,
      count(*) filter (where status = 'planned')::int as planned,
      count(*) filter (where status = 'covered')::int as covered,
      count(*) filter (where status = 'dismissed')::int as dismissed,
      count(*) filter (where last_asked_at >= now() - interval '7 days')::int as asked_last_7_days,
      coalesce(sum(ask_count), 0)::int as unanswered_questions
    from x`);
  return { total: r.total, open: r.open, planned: r.planned, covered: r.covered, dismissed: r.dismissed, askedLast7Days: r.asked_last_7_days, unansweredQuestions: r.unanswered_questions };
}

async function findGroup(id) {
  if (!/^[0-9a-f]{32}$/.test(id)) throw ApiError.notFound('Content gap not found.');
  const r = await one(`with x as (${GROUPS}) select * from x where id = $1`, [id]);
  if (!r) throw ApiError.notFound('Content gap not found.');
  return r;
}

/** Group detail with every time it was asked (newest first). */
export async function getGap(id) {
  const g = await findGroup(id);
  const asks = await many(`with q as (${QUESTIONS})
    select q.message_id, q.content, q.created_at, q.conversation_id, q.user_id, q.outcome, p.full_name, p.email
      from q left join ${T.profiles} p on p.id = q.user_id
     where q.key = $1 order by q.created_at desc limit 200`, [g.key]);
  return {
    ...gapOut(g),
    occurrences: asks.map(a => ({
      messageId: a.message_id, question: a.content, askedAt: a.created_at, answered: a.outcome === 'answered',
      conversationId: a.conversation_id, userId: a.user_id, userName: a.full_name || a.email || null
    }))
  };
}

/** body: { status?, note? } — creates the triage row on first change. */
export async function updateGap(id, body, actor, req) {
  const g = await findGroup(id);
  const note = body.note === undefined ? undefined : (body.note || null);
  const r = await one(
    `insert into ${T.contentGaps} (id, question_key, question, status, note, updated_by)
     values ($1, $2, $3, coalesce($4, 'open'), $5, $6)
     on conflict (question_key) do update set
       status = coalesce($4, ${T.contentGaps}.status),
       note = case when $7 then excluded.note else ${T.contentGaps}.note end,
       question = excluded.question, updated_by = excluded.updated_by
     returning status, note`,
    [g.id, g.key, g.question.slice(0, 4000), body.status || null, note ?? null, actor.id, note !== undefined]);
  await recordAudit({ actor, action: 'content_gap.updated', entityType: 'content_gap', entityId: id, entityLabel: g.question.slice(0, 120),
    details: { from: g.status, to: r.status, noteChanged: note !== undefined }, req });
  return getGap(id);
}

/** Drop triage rows whose questions no longer exist (all conversations deleted). Safe to run any time. */
export async function pruneOrphanGaps() {
  const r = await query(`delete from ${T.contentGaps} s where not exists (
    select 1 from ${T.messages} u where u.role = 'user' and ${KEY_SQL} = s.question_key)`);
  return r.rowCount;
}
