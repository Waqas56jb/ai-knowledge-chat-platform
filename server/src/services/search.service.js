/** Admin global search across users, invitations, sources, conversations and jobs (bounded, parameterized). */
import { many } from '../config/database.js';
import { T } from '../config/constants.js';

export async function adminSearch(q, limit = 5) {
  const term = `%${q.trim()}%`;
  const [users, invitations, sources, conversations, jobs] = await Promise.all([
    many(`select id, full_name, email, role from ${T.profiles} where full_name ilike $1 or email ilike $1 order by full_name limit $2`, [term, limit]),
    many(`select id, email, role, case when revoked_at is not null then 'revoked' when accepted_at is not null then 'accepted' when expires_at <= now() then 'expired' else 'pending' end as status
            from ${T.invitations} where email ilike $1 order by created_at desc limit $2`, [term, limit]),
    many(`select id, title, source_type, status from ${T.sources} where title ilike $1 or array_to_string(tags, ' ') ilike $1 order by updated_at desc limit $2`, [term, limit]),
    many(`select c.id, c.title, p.full_name from ${T.conversations} c left join ${T.profiles} p on p.id = c.user_id where c.title ilike $1 order by c.updated_at desc limit $2`, [term, limit]),
    many(`select j.id, j.job_type, j.status, s.title from ${T.jobs} j left join ${T.sources} s on s.id = j.source_id where j.id::text ilike $1 or s.title ilike $1 order by j.created_at desc limit $2`, [term, limit])
  ]);
  const res = {
    users: users.map(u => ({ id: u.id, title: u.full_name, subtitle: `${u.email} · ${u.role}`, to: `/admin/users/${u.id}` })),
    invitations: invitations.map(i => ({ id: i.id, title: i.email, subtitle: `${i.status} · ${i.role}`, to: `/admin/invitations?focus=${i.id}` })),
    sources: sources.map(s => ({ id: s.id, title: s.title, subtitle: `${s.source_type} · ${s.status}`, to: `/admin/knowledge/${s.id}` })),
    conversations: conversations.map(c => ({ id: c.id, title: c.title, subtitle: c.full_name || 'Deleted user', to: `/admin/conversations/${c.id}` })),
    jobs: jobs.map(j => ({ id: j.id, title: `${j.job_type.replace(/_/g, ' ')} · ${j.id.slice(0, 8)}`, subtitle: `${j.status} · ${j.title || 'Deleted source'}`, to: `/admin/processing?job=${j.id}` }))
  };
  res.total = Object.values(res).reduce((n, a) => n + a.length, 0);
  return res;
}
