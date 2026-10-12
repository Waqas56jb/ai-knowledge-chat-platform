/**
 * Authentication: verifies the Supabase access token (Bearer) with Supabase Auth, then loads the
 * app profile from the database on EVERY request so role and status changes (e.g. suspension)
 * take effect immediately. The user id always comes from the verified token, never the request body.
 */
import { supabaseAdmin } from '../config/supabase.js';
import { one, query } from '../config/database.js';
import { T } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { sha256 } from '../utils/sanitize.js';

const TOKEN_CACHE_MS = 30000;
const cache = new Map(); // sha256(token) -> { userId, email, until }

export async function verifyAccessToken(token) {
  const key = sha256(token);
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    if (error && error.status && error.status >= 500) throw ApiError.unavailable('Authentication service is unavailable.');
    throw ApiError.unauthorized('Your session is invalid or has expired. Sign in again.');
  }
  const v = { userId: data.user.id, email: data.user.email, until: Date.now() + TOKEN_CACHE_MS };
  cache.set(key, v);
  if (cache.size > 5000) for (const [k, x] of cache) if (x.until < Date.now()) cache.delete(k);
  return v;
}
export const forgetToken = token => cache.delete(sha256(token));

export const loadProfile = id => one(
  `select id, email, full_name, role, status, avatar_url, department, notes, source_access, timezone, language, preferences, created_at, updated_at, last_active_at
     from ${T.profiles} where id = $1`, [id]);

/** Required auth. Sets req.user (profile) and req.accessToken. */
export async function authenticate(req, _res, next) {
  try {
    const h = req.get('Authorization') || '';
    const m = h.match(/^Bearer\s+([A-Za-z0-9._-]{20,4096})$/);
    if (!m) throw ApiError.unauthorized();
    const { userId } = await verifyAccessToken(m[1]);
    const profile = await loadProfile(userId);
    if (!profile) throw ApiError.forbidden('This account does not have access to DTS AI.');
    if (profile.status === 'suspended' || profile.status === 'revoked') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended. Contact a workspace administrator.');
    if (profile.status !== 'active') throw new ApiError(403, 'ACCOUNT_INACTIVE', 'This account is not active yet.');
    req.user = profile;
    req.accessToken = m[1];
    // throttled activity timestamp (at most every 5 minutes)
    if (!profile.last_active_at || Date.now() - new Date(profile.last_active_at).getTime() > 5 * 60000) {
      query(`update ${T.profiles} set last_active_at = now() where id = $1`, [userId]).catch(() => {});
    }
    next();
  } catch (e) { next(e); }
}
