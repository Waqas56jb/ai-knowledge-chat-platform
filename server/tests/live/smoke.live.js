/**
 * Quick smoke test against a RUNNING server (npm start). Reads the bootstrap admin credentials from
 * server/.bootstrap-admin-password (never printed).
 *   node tests/live/smoke.live.js
 */
import fs from 'node:fs';
import 'dotenv/config';

const BASE = process.env.SMOKE_BASE || `http://localhost:${process.env.PORT || 4001}/api/v1`;
const [email, password] = fs.readFileSync(new URL('../../.bootstrap-admin-password', import.meta.url), 'utf8').trim().split('\n');
const call = async (method, path, body, token) => {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, body: j };
};
const show = (label, r, pick = b => b?.data ?? b?.error) => console.log(label.padEnd(34), r.status, JSON.stringify(pick(r.body))?.slice(0, 170));

show('GET /health', await call('GET', '/health'));
show('GET /health/ready', await call('GET', '/health/ready'), b => b?.data?.status + ' ' + JSON.stringify(Object.fromEntries(Object.entries(b?.data?.checks || {}).map(([k, v]) => [k, v.ok]))));
show('GET /auth/me (no token)', await call('GET', '/auth/me'));
show('POST /auth/login (bad pw)', await call('POST', '/auth/login', { email, password: 'wrong-password-1' }));
const login = await call('POST', '/auth/login', { email, password });
show('POST /auth/login (admin)', login, b => b?.data ? { role: b.data.user.role, hasAccess: !!b.data.accessToken, hasRefresh: !!b.data.refreshToken } : b?.error);
const t = login.body?.data?.accessToken;
show('GET /auth/me', await call('GET', '/auth/me', null, t), b => b?.data?.user && { email: b.data.user.email, role: b.data.user.role });
show('PATCH /users/me role=admin', await call('PATCH', '/users/me', { role: 'admin' }, t));
show('GET /admin/users', await call('GET', '/admin/users', null, t), b => b?.meta);
show('GET /admin/settings', await call('GET', '/admin/settings', null, t), b => Object.keys(b?.data || {}));
show('GET /admin/analytics/overview', await call('GET', '/admin/analytics/overview?range=7d', null, t), b => b?.data && { kpis: Object.keys(b.data.kpis).length, series: b.data.series.length });
show('GET /admin/audit-logs', await call('GET', '/admin/audit-logs?pageSize=3', null, t), b => b?.data?.map(a => a.action));
show('GET /sources', await call('GET', '/sources', null, t), b => b?.meta);
show('GET /nope', await call('GET', '/nope', null, t));
show('POST /chat (empty KB)', await call('POST', '/chat', { message: 'What are our discount rules?' }, t), b => b?.data && { outcome: b.data.outcome, answer: b.data.answer?.slice(0, 60) });
// remove the conversation the smoke chat created
const convs = await call('GET', '/conversations?pageSize=200', null, t);
for (const c of convs.body?.data || []) if (c.title === 'What are our discount rules?') await call('DELETE', `/conversations/${c.id}`, null, t);
