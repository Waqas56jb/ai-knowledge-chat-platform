/**
 * Safe migration runner for a SHARED database.
 *
 *   npm run db:migrate            apply pending migrations
 *   npm run db:migrate -- --dry   validate only (no changes)
 *   npm run db:status             list applied / pending
 *
 * Safety layers (any failure aborts before COMMIT):
 *  1. Static guard: every statement must be an allowed kind and every object it creates, alters,
 *     grants on, or references in `public.` must start with the app prefix. DROP/TRUNCATE/DO blocks
 *     and role/database/schema changes are refused. The only allowed non-prefixed statement is
 *     `create extension if not exists vector with schema extensions`.
 *  2. Fingerprint guard: before and after each migration, a hash of every object that does NOT
 *     belong to this app (tables, indexes, views, functions, triggers, policies, privileges, RLS
 *     flags in every non-system schema) is compared. Any difference rolls the migration back.
 *  3. Each migration runs in its own transaction with an advisory lock, lock and statement timeouts.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export const PREFIX = 'ai_knowledge_chat_';
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/migrations');
const ALLOWED_EXTENSION = 'create extension if not exists vector with schema extensions';

/** Split SQL into statements, respecting quotes, dollar-quoted bodies and comments. */
export function splitStatements(sql) {
  const out = []; let cur = ''; let i = 0;
  while (i < sql.length) {
    const ch = sql[i], two = sql.slice(i, i + 2);
    if (two === '--') { const nl = sql.indexOf('\n', i); i = nl === -1 ? sql.length : nl + 1; cur += '\n'; continue; }
    if (two === '/*') { const end = sql.indexOf('*/', i + 2); i = end === -1 ? sql.length : end + 2; cur += ' '; continue; }
    if (ch === "'") { const start = i; i++; while (i < sql.length) { if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; continue; } if (sql[i] === "'") { i++; break; } i++; } cur += sql.slice(start, i); continue; }
    if (ch === '$') {
      const m = sql.slice(i).match(/^\$[A-Za-z_]*\$/);
      if (m) { const tag = m[0]; const end = sql.indexOf(tag, i + tag.length); if (end === -1) throw new Error('Unterminated dollar-quoted string'); cur += sql.slice(i, end + tag.length); i = end + tag.length; continue; }
    }
    if (ch === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue; }
    cur += ch; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
const stripName = n => n.replace(/^public\./, '').replace(/"/g, '');
const prefixed = n => stripName(n).startsWith(PREFIX);

/** Throws if a statement could affect anything outside this app's prefix. */
export function guardStatement(stmt) {
  const s = norm(stmt);
  const body = s.replace(/\$[a-z_]*\$[\s\S]*?\$[a-z_]*\$/g, ' $body$ '); // function bodies checked separately below
  const fail = msg => { throw new Error(`Refused statement (${msg}): ${s.slice(0, 160)}`); };

  if (s === ALLOWED_EXTENSION) return;
  if (/\b(drop|truncate)\b/.test(body)) fail('DROP/TRUNCATE are not allowed');
  if (/^do\b/.test(s)) fail('anonymous DO blocks are not allowed');
  if (/\b(alter|create)\s+(role|user|database|schema|extension|publication|subscription|event trigger)\b/.test(body)) fail('role/database/schema/extension changes are not allowed');
  if (/\bsecurity\s+definer\b/.test(s)) fail('SECURITY DEFINER functions are not allowed');

  // every public.<name> referenced anywhere (incl. function bodies) must be ours
  for (const m of s.matchAll(/\bpublic\.("?[a-z0-9_]+"?)/g)) if (!prefixed(m[1])) fail(`references non-app object public.${m[1]}`);
  // only these other schemas may be referenced
  for (const m of s.matchAll(/\b([a-z_]+)\.[a-z_"]+/g)) {
    const schema = m[1];
    if (!['public', 'auth', 'extensions', 'new', 'old', 's', 'c', 'p', 'a', 'q', 'pg_catalog'].includes(schema)) fail(`references schema "${schema}"`);
  }
  if (/\bauth\.(?!users\b|uid\(\))/.test(s)) fail('only auth.users and auth.uid() may be referenced');

  let m;
  if ((m = body.match(/^create table if not exists ([a-z0-9_."]+)/))) { if (!prefixed(m[1])) fail('table name'); return; }
  if ((m = body.match(/^create (?:unique )?index if not exists ([a-z0-9_"]+) on ([a-z0-9_."]+)/))) { if (!prefixed(m[1]) || !prefixed(m[2])) fail('index name/table'); return; }
  if ((m = body.match(/^create or replace function ([a-z0-9_."]+)\s*\(/))) { if (!prefixed(m[1])) fail('function name'); return; }
  if ((m = body.match(/^create (?:or replace )?trigger ([a-z0-9_"]+) .*? on ([a-z0-9_."]+)/))) { if (!prefixed(m[1]) || !prefixed(m[2])) fail('trigger name/table'); return; }
  if ((m = body.match(/^create policy ([a-z0-9_"]+) on ([a-z0-9_."]+)/))) { if (!prefixed(m[1]) || !prefixed(m[2])) fail('policy name/table'); return; }
  if ((m = body.match(/^alter table ([a-z0-9_."]+) (enable|force) row level security$/))) { if (!prefixed(m[1])) fail('alter target'); return; }
  // additive column changes on OUR tables only (never drop/rename/alter type)
  if ((m = body.match(/^alter table ([a-z0-9_."]+) (add column if not exists [a-z0-9_"]+ [^;]+)$/))) {
    if (!prefixed(m[1])) fail('alter target');
    if (/,\s*(drop|alter|rename)\b|\b(drop|rename|alter\s+column|set\s+data\s+type)\b|\btype\s/.test(m[2])) fail('only ADD COLUMN IF NOT EXISTS is allowed');
    return;
  }
  if ((m = body.match(/^(?:revoke|grant) .*? on (table|function) (.+?) (?:from|to) .+$/))) {
    const names = m[1] === 'table' ? m[2].split(',') : [m[2].replace(/\(.*$/, '')];
    if (!names.every(n => prefixed(n.trim()))) fail('grant/revoke target');
    return;
  }
  if ((m = body.match(/^(?:insert into|update|delete from) ([a-z0-9_."]+)/))) { if (!prefixed(m[1])) fail('DML target'); return; }
  if ((m = body.match(/^comment on (?:table|column|function|index) ([a-z0-9_."]+)/))) { if (!prefixed(m[1])) fail('comment target'); return; }
  fail('statement kind is not on the allow-list');
}

const FINGERPRINT_SQL = `
with objs as (
  select 'rel:' || n.nspname || '.' || c.relname || ':' || c.relkind::text || ':' || coalesce(c.relacl::text, '') || ':' || c.relrowsecurity::text as o
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast') and n.nspname not like 'pg_temp%' and n.nspname not like 'pg_toast_temp%'
     and c.relname not like '${PREFIX}%'
  union all
  select 'fn:' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || '):' || md5(p.prosrc) || ':' || coalesce(p.proacl::text, '')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname not in ('pg_catalog', 'information_schema', 'extensions') and p.proname not like '${PREFIX}%'
  union all
  select 'trg:' || t.tgname || ':' || t.tgrelid::regclass::text from pg_trigger t where not t.tgisinternal and t.tgname not like '${PREFIX}%'
  union all
  select 'pol:' || pol.polname || ':' || pol.polrelid::regclass::text from pg_policy pol where pol.polname not like '${PREFIX}%'
  union all
  select 'ns:' || nspname || ':' || coalesce(nspacl::text, '') from pg_namespace where nspname not like 'pg_%' and nspname <> 'information_schema'
)
select count(*)::int as n, md5(coalesce(string_agg(o, '|' order by o), '')) as hash from objs`;

function loadMigrations() {
  return fs.readdirSync(DIR).filter(f => /^\d{4}_.+\.sql$/.test(f)).sort().map(file => {
    const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
    return { version: file.slice(0, 4), name: file, sql, checksum: crypto.createHash('sha256').update(sql).digest('hex'), statements: splitStatements(sql) };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry'), statusOnly = args.includes('--status');
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set (server/.env).'); process.exit(1); }

  const migrations = loadMigrations();
  // 1. static guard on everything before touching the database
  for (const m of migrations) for (const st of m.statements) {
    try { guardStatement(st); } catch (e) { console.error(`✗ ${m.name}: ${e.message}`); process.exit(1); }
  }
  console.log(`Static guard passed for ${migrations.length} migration file(s), ${migrations.reduce((n, m) => n + m.statements.length, 0)} statements.`);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const exists = (await client.query(`select to_regclass('public.${PREFIX}schema_migrations') as t`)).rows[0].t;
    if (!exists && !dry && !statusOnly) {
      await client.query(`create table if not exists public.${PREFIX}schema_migrations (version text primary key, name text not null, checksum text not null, applied_at timestamptz not null default now())`);
      await client.query(`alter table public.${PREFIX}schema_migrations enable row level security`);
      await client.query(`revoke all on table public.${PREFIX}schema_migrations from anon, authenticated`);
    }
    const applied = new Map(exists || (!dry && !statusOnly) ? (await client.query(`select version, name, checksum from public.${PREFIX}schema_migrations`)).rows.map(r => [r.version, r]) : []);

    for (const m of migrations) {
      const a = applied.get(m.version);
      if (a && a.checksum !== m.checksum) throw new Error(`${m.name} was changed after being applied (checksum mismatch). Create a new migration instead.`);
    }
    const pending = migrations.filter(m => !applied.has(m.version));
    if (statusOnly || dry) {
      migrations.forEach(m => console.log(`  ${applied.has(m.version) ? '✓ applied' : '· pending'}  ${m.name}`));
      if (dry) console.log('Dry run: nothing was changed.');
      return;
    }
    if (!pending.length) { console.log('Database is up to date.'); return; }

    for (const m of pending) {
      await client.query('begin');
      try {
        await client.query("set local lock_timeout = '10s'");
        await client.query("set local statement_timeout = '120s'");
        await client.query('set local search_path = public, extensions');
        await client.query(`select pg_advisory_xact_lock(hashtext('${PREFIX}migrations'))`);
        const before = (await client.query(FINGERPRINT_SQL)).rows[0];
        for (const st of m.statements) await client.query(st);
        const after = (await client.query(FINGERPRINT_SQL)).rows[0];
        if (before.hash !== after.hash) throw new Error(`Fingerprint changed (${before.n} → ${after.n} foreign objects): this migration affected something outside "${PREFIX}*". Rolled back.`);
        await client.query(`insert into public.${PREFIX}schema_migrations (version, name, checksum) values ($1, $2, $3)`, [m.version, m.name, m.checksum]);
        await client.query('commit');
        console.log(`✓ applied ${m.name} (${m.statements.length} statements; other projects' objects unchanged: ${before.n})`);
      } catch (e) {
        await client.query('rollback');
        throw new Error(`${m.name} failed and was rolled back: ${e.message}`);
      }
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error('✗', e.message); process.exit(1); });
}
