/**
 * Verifies configuration and connectivity WITHOUT printing secret values.
 *   npm run verify-config
 */
import { env, configuredSecrets } from '../src/config/env.js';
import { pool } from '../src/config/database.js';
import { supabaseAdmin } from '../src/config/supabase.js';
import { openai, AI } from '../src/config/openai.js';
import { mailEnabled, verifyMail, closeMail } from '../src/services/mail.service.js';

const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { console.log(`  ✗ ${m}`); process.exitCode = 1; };

console.log('Configuration');
configuredSecrets().forEach(s => (s.set ? ok(`${s.name} is set`) : bad(`${s.name} is missing`)));
ok(`API: http://localhost:${env.PORT}${env.API_PREFIX}`);
ok(`CORS origins: ${env.corsOrigins.join(', ')}`);
ok(`Models: chat=${AI.chatModel}, embeddings=${AI.embeddingModel} (${AI.embeddingDimensions} dims)`);

console.log('\nDatabase');
try {
  const v = await pool.query('select current_database() as db');
  ok(`connected (${v.rows[0].db})`);
  const m = await pool.query('select version, name from public.ai_knowledge_chat_schema_migrations order by version');
  ok(`${m.rowCount} migrations applied: ${m.rows.map(r => r.name).join(', ')}`);
  const vec = await pool.query("select extversion from pg_extension where extname = 'vector'");
  vec.rowCount ? ok(`pgvector ${vec.rows[0].extversion} installed`) : bad('pgvector is not installed');
  const t = await pool.query("select count(*)::int as n from pg_tables where schemaname = 'public' and tablename like 'ai_knowledge_chat_%'");
  ok(`${t.rows[0].n} app tables (prefix ai_knowledge_chat_)`);
  const rls = await pool.query("select count(*)::int as n from pg_tables where schemaname = 'public' and tablename like 'ai_knowledge_chat_%' and not rowsecurity");
  rls.rows[0].n === 0 ? ok('RLS enabled on every app table') : bad(`${rls.rows[0].n} app tables without RLS`);
  const admins = await pool.query("select count(*)::int as n from public.ai_knowledge_chat_profiles where role = 'admin' and status = 'active'");
  admins.rows[0].n ? ok(`${admins.rows[0].n} active administrator(s)`) : console.log('  ! no administrator yet — run: npm run bootstrap-admin -- --email you@example.com --generate');
} catch (e) { bad(`database: ${e.code || ''} ${e.message}`); }

console.log('\nSupabase');
try {
  const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  error ? bad(`auth admin API: ${error.message}`) : ok('auth admin API reachable (service role key valid)');
  const { data: b } = await supabaseAdmin.storage.getBucket(env.STORAGE_BUCKET);
  if (!b) console.log(`  ! storage bucket ${env.STORAGE_BUCKET} will be created (private) on first upload`);
  else b.public ? bad(`storage bucket ${env.STORAGE_BUCKET} is PUBLIC — make it private`) : ok(`storage bucket ${env.STORAGE_BUCKET} exists and is private`);
} catch (e) { bad(`supabase: ${e.message}`); }

console.log('\nOpenAI');
try {
  const r = await openai.embeddings.create({ model: AI.embeddingModel, input: ['configuration check'] });
  r.data[0].embedding.length === AI.embeddingDimensions ? ok(`embeddings OK (${r.data[0].embedding.length} dims)`) : bad(`embedding dims ${r.data[0].embedding.length} ≠ ${AI.embeddingDimensions}`);
} catch (e) { bad(`OpenAI: ${e.status || ''} ${e.code || e.message}`); }

console.log('\nEmail');
if (!mailEnabled()) console.log('  ! outgoing email is disabled (MAIL_ENABLED=false): invitation links must be shared manually');
else {
  const v = await verifyMail();
  v.ok ? ok(`SMTP login OK (${env.SMTP_HOST}:${env.SMTP_PORT}, sending as ${env.MAIL_FROM_EMAIL || env.SMTP_USER})`) : bad(`SMTP: ${v.reason}`);
  closeMail();
}

await pool.end();
console.log(process.exitCode ? '\nSome checks failed.' : '\nAll checks passed.');
