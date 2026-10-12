/**
 * Analytics from REAL records, aggregated in SQL (grouped by UTC day/hour). No demo values.
 * Ranges: 'today' (hourly, last 24 h) | '7d' | '30d' | '90d' | { from, to } (max 366 days).
 */
import { one, many } from '../config/database.js';
import { T } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { TYPE_GROUP } from './source.service.js';

const DAY = 864e5;
const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : cur ? 100 : 0);
const iso = d => d.toISOString().slice(0, 10);

/** Resolve a range to [start, end) timestamps plus the previous period of equal length. */
export function resolveRange(range = '30d', from, to) {
  const now = new Date();
  if (range === 'today') { const end = now; const start = new Date(end.getTime() - DAY); return { key: 'today', hourly: true, start, end, prevStart: new Date(start.getTime() - DAY), days: 1 }; }
  if (range === 'custom' || (from && to)) {
    const s = new Date(`${from}T00:00:00Z`), e = new Date(new Date(`${to}T00:00:00Z`).getTime() + DAY);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) throw ApiError.validation('Choose a valid date range (from must be before to).');
    const days = Math.round((e - s) / DAY);
    if (days > 366) throw ApiError.validation('The date range can be at most 366 days.');
    return { key: 'custom', hourly: false, start: s, end: e, prevStart: new Date(s.getTime() - days * DAY), days };
  }
  const days = { '7d': 7, '30d': 30, '90d': 90 }[range];
  if (!days) throw ApiError.validation('Unknown range. Use today, 7d, 30d, 90d or from/to dates.');
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + DAY);
  const start = new Date(end.getTime() - days * DAY);
  return { key: range, hourly: false, start, end, prevStart: new Date(start.getTime() - days * DAY), days };
}

async function series(r) {
  const unit = r.hourly ? 'hour' : 'day';
  const rows = await many(`
    with buckets as (select generate_series(date_trunc('${unit}', $1::timestamptz at time zone 'UTC'), date_trunc('${unit}', ($2::timestamptz - interval '1 second') at time zone 'UTC'), interval '1 ${unit}') as b),
    msg as (
      select date_trunc('${unit}', m.created_at at time zone 'UTC') as b,
             count(*) filter (where m.role = 'user') as questions,
             count(distinct c.user_id) filter (where m.role = 'user') as active_users,
             count(*) filter (where m.outcome = 'answered') as answered,
             count(*) filter (where m.outcome = 'insufficient_evidence') as insufficient,
             count(*) filter (where m.outcome = 'out_of_scope') as out_of_scope,
             count(*) filter (where m.outcome = 'error') as errors
        from ${T.messages} m join ${T.conversations} c on c.id = m.conversation_id
       where m.created_at >= $1 and m.created_at < $2 group by 1),
    conv as (select date_trunc('${unit}', created_at at time zone 'UTC') as b, count(*) as n from ${T.conversations} where created_at >= $1 and created_at < $2 group by 1),
    usr as (select date_trunc('${unit}', created_at at time zone 'UTC') as b, count(*) as n from ${T.profiles} where created_at >= $1 and created_at < $2 group by 1),
    base as (select count(*)::int as n from ${T.profiles} where created_at < $1)
    select to_char(buckets.b, 'YYYY-MM-DD"T"HH24:MI:SS') as bucket,
           coalesce(usr.n, 0)::int as new_users,
           (base.n + coalesce(sum(usr.n) over (order by buckets.b), 0))::int as total_users,
           coalesce(msg.active_users, 0)::int as active_users,
           coalesce(conv.n, 0)::int as conversations,
           coalesce(msg.questions, 0)::int as questions,
           coalesce(msg.answered, 0)::int as answered,
           coalesce(msg.insufficient, 0)::int as insufficient,
           coalesce(msg.out_of_scope, 0)::int as out_of_scope,
           coalesce(msg.errors, 0)::int as errors
      from buckets cross join base
      left join msg on msg.b = buckets.b left join conv on conv.b = buckets.b left join usr on usr.b = buckets.b
     order by buckets.b`, [r.start.toISOString(), r.end.toISOString()]);
  return rows.map(x => {
    const d = new Date(`${x.bucket}Z`); // bucket is a UTC wall-clock string
    return {
      date: d.toISOString(),
      label: r.hourly ? `${String(d.getUTCHours()).padStart(2, '0')}:00` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      newUsers: x.new_users, totalUsers: x.total_users, activeUsers: x.active_users, conversations: x.conversations, questions: x.questions,
      answeredWithSources: x.answered, noEvidence: x.insufficient, outOfScope: x.out_of_scope, failed: x.errors
    };
  });
}

async function totals(start, end) {
  return one(`select
      (select count(*)::int from ${T.profiles} where created_at >= $1 and created_at < $2) as new_users,
      (select count(distinct c.user_id)::int from ${T.messages} m join ${T.conversations} c on c.id = m.conversation_id where m.role = 'user' and m.created_at >= $1 and m.created_at < $2) as active_users,
      (select count(*)::int from ${T.conversations} where created_at >= $1 and created_at < $2) as conversations,
      (select count(*)::int from ${T.messages} where role = 'user' and created_at >= $1 and created_at < $2) as questions,
      (select count(*)::int from ${T.messages} where outcome = 'answered' and created_at >= $1 and created_at < $2) as answered,
      (select count(*)::int from ${T.messages} where outcome = 'insufficient_evidence' and created_at >= $1 and created_at < $2) as insufficient,
      (select count(*)::int from ${T.messages} where outcome = 'out_of_scope' and created_at >= $1 and created_at < $2) as out_of_scope,
      (select count(*)::int from ${T.messages} where outcome = 'error' and created_at >= $1 and created_at < $2) as errors,
      (select count(*)::int from ${T.jobs} where status = 'completed' and completed_at >= $1 and completed_at < $2) as jobs_completed,
      (select count(*)::int from ${T.jobs} where status = 'failed' and completed_at >= $1 and completed_at < $2) as jobs_failed,
      (select count(*)::int from ${T.sources} where created_at >= $1 and created_at < $2) as sources_added`, [start.toISOString(), end.toISOString()]);
}

export async function getOverview(range, from, to) {
  const r = resolveRange(range, from, to);
  const [s, cur, prev, counts, srcGroups, srcStatus, topUsers, topSources] = await Promise.all([
    series(r), totals(r.start, r.end), totals(r.prevStart, r.start),
    one(`select (select count(*)::int from ${T.profiles}) as users, (select count(*)::int from ${T.sources}) as sources,
                (select count(*)::int from ${T.conversations}) as conversations_all`),
    many(`select source_type, count(*)::int as n from ${T.sources} group by 1`),
    many(`select status, count(*)::int as n from ${T.sources} group by 1`),
    many(`select p.id, p.full_name as name, count(*) filter (where m.role = 'user')::int as questions, count(distinct c.id)::int as conversations
            from ${T.messages} m join ${T.conversations} c on c.id = m.conversation_id join ${T.profiles} p on p.id = c.user_id
           where m.created_at >= $1 and m.created_at < $2 group by p.id, p.full_name order by questions desc limit 8`, [r.start.toISOString(), r.end.toISOString()]),
    many(`select ci ->> 'sourceId' as id, max(ci ->> 'sourceTitle') as title, max(ci ->> 'sourceType') as type, count(*)::int as citations
            from ${T.messages} m, jsonb_array_elements(m.citations) ci where m.created_at >= $1 and m.created_at < $2
           group by 1 order by citations desc limit 8`, [r.start.toISOString(), r.end.toISOString()])
  ]);
  const unsupported = cur.insufficient + cur.out_of_scope + cur.errors, prevUnsupported = prev.insufficient + prev.out_of_scope + prev.errors;
  const groups = { youtube: 'YouTube videos', document: 'Documents', text: 'Text resources', conversation: 'Client conversations' };
  const sourceDistribution = Object.entries(groups).map(([key, label]) => ({ key, label, value: srcGroups.filter(g => TYPE_GROUP[g.source_type] === key).reduce((n, g) => n + g.n, 0) }));
  return {
    range: r.key, days: r.days, from: r.start.toISOString(), to: r.end.toISOString(), hourly: r.hourly, demo: false,
    series: s,
    totals: { ...cur, unsupported },
    previous: { ...prev, unsupported: prevUnsupported },
    kpis: {
      totalUsers: { value: counts.users, delta: pct(cur.new_users, prev.new_users), hint: `${cur.new_users} new in this period` },
      activeUsers: { value: cur.active_users, delta: pct(cur.active_users, prev.active_users), hint: 'Users who asked at least one question in this period' },
      sources: { value: counts.sources, delta: null, hint: `${cur.sources_added} added in this period` },
      conversations: { value: cur.conversations, delta: pct(cur.conversations, prev.conversations), hint: 'Conversations started in this period' },
      questions: { value: cur.questions, delta: pct(cur.questions, prev.questions) },
      answered: { value: cur.answered, delta: pct(cur.answered, prev.answered), hint: 'Answers that cite indexed sources' },
      unsupported: { value: unsupported, delta: pct(unsupported, prevUnsupported), invert: true, hint: 'No evidence, out of scope or errors' },
      newRegistrations: { value: cur.new_users, delta: pct(cur.new_users, prev.new_users) },
      citationRate: { value: cur.questions ? Math.round((cur.answered / cur.questions) * 1000) / 10 : 0, suffix: '%', delta: null },
      processingSuccess: { value: cur.jobs_completed + cur.jobs_failed ? Math.round((cur.jobs_completed / (cur.jobs_completed + cur.jobs_failed)) * 1000) / 10 : 0, suffix: '%', delta: null, hint: 'Completed vs failed processing jobs in this period' }
    },
    sourceDistribution,
    outcomes: [
      { key: 'answered', label: 'Answered with sources', value: cur.answered },
      { key: 'insufficient_evidence', label: 'No supporting evidence', value: cur.insufficient },
      { key: 'out_of_scope', label: 'Out of scope', value: cur.out_of_scope },
      { key: 'error', label: 'Errors', value: cur.errors }
    ],
    processing: ['indexed', 'processing', 'pending', 'failed', 'disabled'].map(k => ({ key: k, label: k[0].toUpperCase() + k.slice(1), value: srcStatus.find(x => x.status === k)?.n || 0 })),
    topUsers: topUsers.map(u => ({ id: u.id, name: u.name, questions: u.questions, conversations: u.conversations })),
    topSources: topSources.map(x => ({ id: x.id, title: x.title, type: x.type, citations: x.citations }))
  };
}

export const iso10 = iso;
