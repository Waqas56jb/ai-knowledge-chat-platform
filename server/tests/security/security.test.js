/** Security tests: escalation, cross-user access, data exposure, rate limiting, audit integrity. */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('../../src/services/openai.service.js', async () => {
  const { fakeVector } = await import('../helpers/fakeVector.js');
  return { embed: vi.fn(async t => ({ vectors: t.map(fakeVector), tokens: 1 })), chatJson: vi.fn(async () => ({ content: '{"outcome":"insufficient_evidence","answer":"","citations":[]}', usage: {}, model: 'mock' })) };
});

const { api, P, makeUser, cleanup, RUN } = await import('../helpers/setup.js');
const { pool } = await import('../../src/config/database.js');

let admin, member, other;
const auth = u => ({ Authorization: `Bearer ${u.token}` });

beforeAll(async () => { [admin, member, other] = await Promise.all([makeUser('admin'), makeUser('member'), makeUser('member')]); });
afterAll(async () => { await cleanup(); await pool.end(); });

describe('privilege escalation', () => {
  it('a user cannot set their own role or status', async () => {
    for (const body of [{ role: 'admin' }, { status: 'active' }, { email: 'x@y.z' }, { fullName: 'ok', role: 'admin' }]) {
      expect((await api().patch(`${P}/users/me`).set(auth(member)).send(body)).status).toBe(422);
    }
    expect((await api().get(`${P}/auth/me`).set(auth(member))).body.data.user.role).toBe('member');
  });
  it('a member cannot change roles through the admin API', async () => {
    expect((await api().patch(`${P}/admin/users/${member.id}`).set(auth(member)).send({ role: 'admin' })).status).toBe(403);
    expect((await api().post(`${P}/admin/users/${other.id}/suspend`).set(auth(member))).status).toBe(403);
  });
  it('an admin cannot lock themselves out', async () => {
    expect((await api().patch(`${P}/admin/users/${admin.id}`).set(auth(admin)).send({ role: 'member' })).status).toBe(403);
    expect((await api().post(`${P}/admin/users/${admin.id}/suspend`).set(auth(admin))).status).toBe(403);
    expect((await api().delete(`${P}/admin/users/${admin.id}`).set(auth(admin))).status).toBe(403);
  });
  it('client-supplied identity fields are ignored', async () => {
    const r = await api().post(`${P}/conversations`).set(auth(member)).send({ title: 'x', userId: other.id });
    expect(r.status).toBe(422); // unknown field rejected; owner always comes from the token
  });
});

describe('cross-user data access', () => {
  it('guessing another user\'s conversation or message id gives 404', async () => {
    const c = (await api().post(`${P}/conversations`).set(auth(other)).send({ title: `secret ${RUN}` })).body.data;
    expect((await api().get(`${P}/conversations/${c.id}`).set(auth(member))).status).toBe(404);
    const msg = (await pool.query(`insert into public.ai_knowledge_chat_messages (conversation_id, role, content, outcome) values ($1, 'assistant', 'private answer', 'answered') returning id`, [c.id])).rows[0];
    expect((await api().post(`${P}/messages/${msg.id}/feedback`).set(auth(member)).send({ rating: 'up' })).status).toBe(404);
  });
  it('notifications belong to their recipient only', async () => {
    const n = (await pool.query(`insert into public.ai_knowledge_chat_notifications (user_id, type, title, message) values ($1, 'system', $2, 'private') returning id`, [other.id, `t ${RUN}`])).rows[0];
    expect((await api().patch(`${P}/notifications/${n.id}/read`).set(auth(member))).status).toBe(404);
    expect((await api().get(`${P}/notifications`).set(auth(member))).body.data.map(x => x.id)).not.toContain(n.id);
  });
});

describe('Supabase REST exposure', () => {
  it('the anon key cannot read app tables or call app functions', async () => {
    const h = { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}` };
    for (const t of ['profiles', 'conversations', 'messages', 'chunks', 'invitations', 'audit_logs', 'settings']) {
      const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/ai_knowledge_chat_${t}?select=*&limit=1`, { headers: h });
      const body = await r.text();
      expect(r.status >= 400 || body === '[]').toBe(true);
    }
    const rpc = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/ai_knowledge_chat_accessible_source_ids`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_user_id: admin.id }) });
    expect(rpc.status).toBeGreaterThanOrEqual(400);
  });
});

describe('audit integrity', () => {
  it('audit rows cannot be updated or deleted', async () => {
    await expect(pool.query(`update public.ai_knowledge_chat_audit_logs set action = 'x' where id = (select id from public.ai_knowledge_chat_audit_logs limit 1)`)).rejects.toThrow(/append-only/);
    await expect(pool.query(`delete from public.ai_knowledge_chat_audit_logs where id = (select id from public.ai_knowledge_chat_audit_logs limit 1)`)).rejects.toThrow(/append-only/);
  });
  it('there is no API to modify audit logs', async () => {
    expect((await api().delete(`${P}/admin/audit-logs/00000000-0000-4000-8000-000000000000`).set(auth(admin))).status).toBe(404);
    expect((await api().patch(`${P}/admin/audit-logs/00000000-0000-4000-8000-000000000000`).set(auth(admin)).send({})).status).toBe(404);
  });
});

describe('response hygiene', () => {
  it('security headers are present and CORS is an allowlist', async () => {
    const r = await api().get(`${P}/health`).set('Origin', 'https://evil.example');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-powered-by']).toBeUndefined();
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
    const ok = await api().get(`${P}/health`).set('Origin', process.env.CLIENT_URL || 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe(process.env.CLIENT_URL || 'http://localhost:5173');
  });
});
