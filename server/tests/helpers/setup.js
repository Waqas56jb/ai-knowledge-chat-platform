/**
 * Integration-test helpers: real database + real Supabase Auth, OpenAI mocked.
 * Every record uses the `nexus-test-<run>` marker and is removed in cleanup().
 */
import crypto from 'node:crypto';
import request from 'supertest';
import { supabaseAdmin } from '../../src/config/supabase.js';
import { pool, one } from '../../src/config/database.js';
import { createApp } from '../../src/app.js';

export const RUN = `nexus-test-${crypto.randomBytes(3).toString('hex')}`;
export const START = new Date();
export const app = createApp();
export const api = () => request(app);
export const P = '/api/v1';

const createdUsers = [];

export { fakeVector } from './fakeVector.js';

/** Create a confirmed auth user + app profile, then sign in through the API. */
export async function makeUser(role = 'member', status = 'active') {
  const email = `${RUN}-${role}-${crypto.randomBytes(2).toString('hex')}@example.test`;
  const password = `Test-${crypto.randomBytes(8).toString('base64url')}1a`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUsers.push(data.user.id);
  await pool.query(`insert into public.ai_knowledge_chat_profiles (id, email, full_name, role, status) values ($1, $2, $3, $4, 'active')`, [data.user.id, email, `Test ${role}`, role]);
  const login = await api().post(`${P}/auth/login`).send({ email, password });
  if (login.status !== 200) throw new Error(`login failed for test user: ${JSON.stringify(login.body)}`);
  if (status !== 'active') await pool.query(`update public.ai_knowledge_chat_profiles set status = $2 where id = $1`, [data.user.id, status]);
  return { id: data.user.id, email, password, token: login.body.data.accessToken };
}

/** Insert a source + text directly and index it synchronously with the (mocked) pipeline. */
export async function indexTextSource({ title, text, visibility = 'workspace', ownerId = null, allowedUserIds = [] }) {
  const { runJob } = await import('../../src/jobs/processSource.job.js');
  const s = await one(`insert into public.ai_knowledge_chat_sources (title, source_type, visibility, status, owner_id, created_by, metadata)
                       values ($1, 'business_knowledge', $2, 'pending', $3, $3, '{"kind":"text"}') returning *`, [`${title} (${RUN})`, visibility, ownerId]);
  await pool.query(`insert into public.ai_knowledge_chat_source_contents (source_id, content, provider) values ($1, $2, 'text')`, [s.id, text]);
  for (const u of allowedUserIds) await pool.query(`insert into public.ai_knowledge_chat_source_access (source_id, user_id) values ($1, $2)`, [s.id, u]);
  // created directly as "processing" so a separately running dev-server worker can never claim it
  const job = await one(`insert into public.ai_knowledge_chat_jobs (source_id, job_type, status, attempts, locked_by, locked_at, started_at)
                         values ($1, 'text_normalization', 'processing', 1, 'vitest', now(), now()) returning *`, [s.id]);
  await runJob(job);
  return one(`select * from public.ai_knowledge_chat_sources where id = $1`, [s.id]);
}

export async function cleanup() {
  for (const id of createdUsers) await supabaseAdmin.auth.admin.deleteUser(id).catch(() => {});
  await pool.query(`delete from public.ai_knowledge_chat_profiles where email like $1`, [`${RUN}%`]);
  await pool.query(`delete from public.ai_knowledge_chat_sources where title like $1`, [`%(${RUN})%`]);
  await pool.query(`delete from public.ai_knowledge_chat_invitations where email like $1`, [`${RUN}%`]);
  await pool.query(`delete from public.ai_knowledge_chat_notifications where created_at >= $1 and (title like $2 or message like $2 or message like '%(${RUN})%')`, [START, `%${RUN}%`]);
  await pool.query(`delete from public.ai_knowledge_chat_usage_events where created_at >= $1 and user_id is null and source_id is null`, [START]);
  await pool.query(`delete from public.ai_knowledge_chat_content_gaps where question_key like $1`, [`%${RUN.replace(/-/g, ' ')}%`]);
}
