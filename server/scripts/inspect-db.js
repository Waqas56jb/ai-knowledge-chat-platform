/**
 * READ-ONLY database inspection. Runs inside `BEGIN READ ONLY`, so it cannot change anything.
 * Prints schemas, existing tables, extensions, storage buckets and any objects that already use our prefix.
 * Never prints credentials.
 *   npm run db:inspect
 */
import 'dotenv/config';
import pg from 'pg';

const PREFIX = process.env.DB_TABLE_PREFIX || 'ai_knowledge_chat_';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, statement_timeout: 20000 });

const q = async (sql, params) => (await client.query(sql, params)).rows;

try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const [info] = await q("select version() as version, current_user as role, current_database() as db");
  console.log('Connected:', info.db, '| role:', info.role, '|', info.version.split(',')[0]);

  const schemas = await q(`select table_schema, count(*)::int as tables from information_schema.tables
    where table_schema not in ('pg_catalog','information_schema') and table_type = 'BASE TABLE' group by 1 order by 1`);
  console.log('\nTables per schema:'); schemas.forEach(s => console.log(`  ${s.table_schema}: ${s.tables}`));

  const pub = await q(`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1`);
  console.log(`\npublic tables (${pub.length}):`); console.log('  ' + pub.map(r => r.table_name).join(', '));

  const ours = await q(`select n.nspname as schema, c.relname as name, c.relkind as kind from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relname like $1 order by 1,2`, [PREFIX + '%']);
  const ourFns = await q(`select n.nspname as schema, p.proname as name from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname like $1`, [PREFIX + '%']);
  console.log(`\nObjects already using prefix "${PREFIX}": ${ours.length} relations, ${ourFns.length} functions`);
  [...ours, ...ourFns].forEach(o => console.log('  ', o.schema + '.' + o.name, o.kind || 'function'));

  const ext = await q('select e.extname, e.extversion, n.nspname as schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace order by 1');
  console.log('\nInstalled extensions:'); ext.forEach(e => console.log(`  ${e.extname} ${e.extversion} (schema ${e.schema})`));
  const vec = await q("select name, default_version, installed_version from pg_available_extensions where name = 'vector'");
  console.log('pgvector available:', vec[0] ? `yes (default ${vec[0].default_version}, installed: ${vec[0].installed_version || 'no'})` : 'no');

  try {
    const buckets = await q('select id, public from storage.buckets order by id');
    console.log(`\nStorage buckets (${buckets.length}):`, buckets.map(b => `${b.id}${b.public ? ' (public)' : ''}`).join(', ') || '—');
  } catch (e) { console.log('\nStorage buckets: not readable (' + e.code + ')'); }

  try {
    const [u] = await q('select count(*)::int as n from auth.users');
    console.log('Supabase Auth users (all projects share this):', u.n);
  } catch (e) { console.log('auth.users: not readable (' + e.code + ')'); }

  await client.query('ROLLBACK');
} catch (e) {
  console.error('Inspection failed:', e.code || '', e.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
