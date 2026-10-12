/** GET /health/ready → { status, checks: { database, migrations, auth, openai } } (no auth needed). */
import { buildUrl } from './api';

export async function getReadiness() {
  let res;
  try { res = await fetch(buildUrl('/health/ready'), { headers: { Accept: 'application/json' } }); }
  catch (e) { return { reachable: false, status: 'unreachable', checks: {}, checkedAt: new Date().toISOString() }; }
  let json = null;
  try { json = await res.json(); } catch (e) { /* not JSON */ }
  const data = (json && (json.data || (json.error && json.error.details))) || {};
  return { reachable: true, httpStatus: res.status, status: data.status || (res.ok ? 'ready' : 'not_ready'), checks: data.checks || {}, checkedAt: new Date().toISOString() };
}
