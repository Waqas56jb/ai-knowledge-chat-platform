/**
 * Create the FIRST administrator (server-side only; there is no public endpoint for this).
 *
 *   npm run bootstrap-admin -- --email admin@company.com --name "Ada Admin" --generate
 *       generates a strong password and writes it to server/.bootstrap-admin-password (git-ignored,
 *       never printed). Sign in, change the password, then delete the file.
 *   BOOTSTRAP_ADMIN_PASSWORD=... npm run bootstrap-admin -- --email ... --name ...
 *       uses a password you supply via the environment (not printed).
 *
 * Safety:
 *  - Refuses if an active administrator already exists (use --allow-additional to add another).
 *  - Refuses if the email already exists in Supabase Auth (it may belong to another project that shares
 *    this Supabase instance) unless --use-existing-auth-user is given; that user's password is never changed.
 *  - Records an audit event.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/config/database.js';
import { supabaseAdmin } from '../src/config/supabase.js';

const args = process.argv.slice(2);
const arg = n => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const flag = n => args.includes(`--${n}`);
const fail = m => { console.error(`✗ ${m}`); process.exit(1); };

const email = (arg('email') || '').trim().toLowerCase();
const name = (arg('name') || 'Administrator').trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Provide a valid --email.');
if (name.length < 2 || name.length > 80) fail('--name must be 2-80 characters.');

let password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const generate = flag('generate');
if (!password && !generate && !flag('use-existing-auth-user')) fail('Set BOOTSTRAP_ADMIN_PASSWORD or pass --generate.');
if (generate) {
  // 20 chars from a safe alphabet + guaranteed letter and digit
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  password = Array.from(crypto.randomBytes(18), b => alpha[b % alpha.length]).join('') + 'a7';
}
if (password && (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) fail('The password must be at least 12 characters and contain letters and numbers.');

try {
  const admins = (await pool.query(`select count(*)::int as n from public.ai_knowledge_chat_profiles where role = 'admin' and status = 'active'`)).rows[0].n;
  if (admins > 0 && !flag('allow-additional')) fail(`${admins} active administrator(s) already exist. Use --allow-additional to add another.`);
  const existingProfile = (await pool.query(`select id, role from public.ai_knowledge_chat_profiles where lower(email) = $1`, [email])).rows[0];
  if (existingProfile) fail(`${email} already has a NEXUS AI profile (role: ${existingProfile.role}). Change roles from the admin panel instead.`);

  let userId;
  const existingAuth = (await pool.query('select id from auth.users where lower(email) = $1', [email])).rows[0];
  if (existingAuth) {
    if (!flag('use-existing-auth-user')) fail(`${email} already exists in Supabase Auth (possibly used by another project). Re-run with --use-existing-auth-user to link it as administrator WITHOUT changing its password.`);
    userId = existingAuth.id;
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name, app: 'nexus-ai' } });
    if (error) fail(`Supabase Auth refused to create the user: ${error.message}`);
    userId = data.user.id;
  }

  await pool.query(`insert into public.ai_knowledge_chat_profiles (id, email, full_name, role, status) values ($1, $2, $3, 'admin', 'active')`, [userId, email, name]);
  await pool.query(`insert into public.ai_knowledge_chat_audit_logs (actor_id, actor_email, action, entity_type, entity_id, entity_label, details)
                    values (null, 'cli:bootstrap-admin', 'admin.bootstrapped', 'user', $1, $2, $3)`, [userId, email, JSON.stringify({ linkedExistingAuthUser: !!existingAuth })]);

  console.log(`✓ Administrator ready: ${email} (${name})`);
  if (generate && !existingAuth) {
    const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.bootstrap-admin-password');
    fs.writeFileSync(file, `${email}\n${password}\n`, { mode: 0o600 });
    console.log(`  The generated password was written to ${path.relative(process.cwd(), file)} (git-ignored). Sign in, change it, then delete that file.`);
  }
} finally {
  await pool.end();
}
