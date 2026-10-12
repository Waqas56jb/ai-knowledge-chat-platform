/**
 * HTTP client for the DTS AI API (see server/docs/API.md).
 * - Base URL from VITE_API_BASE_URL.
 * - Sends the Bearer access token; on a 401 it refreshes once via POST /auth/refresh (concurrent
 *   requests share one refresh) and retries. If the refresh fails the session is cleared, which makes
 *   the route guards redirect to /login.
 * - Errors are ApiError instances with `code`, `status`, `details` and `requestId`.
 * - Successful mutations bump a data version so mounted queries refetch (see hooks/useQuery).
 */
import { clearSession, getSessionSync, saveSession } from './sessionStore';

const BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, { code = 'ERROR', status = 0, details, requestId } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

/* ------------------------------ data version ------------------------------ */

let version = 0;
const listeners = new Set();
export const getDataVersion = () => version;
export function subscribeData(fn) { listeners.add(fn); return () => listeners.delete(fn); }
/** Tell every mounted query that server data changed. */
export function invalidate() { version++; listeners.forEach(fn => fn()); }

/* --------------------------------- helpers -------------------------------- */

const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];
const NO_INVALIDATE = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/forgot-password'];

/** Build a URL; skips empty / 'all' query values so UI filter defaults map to "no filter". */
export function buildUrl(path, query) {
  const url = new URL(BASE + path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || v === 'all') return;
      url.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v));
    });
  }
  return url.toString();
}

async function readJson(res) {
  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) return null;
  try { return await res.json(); } catch (e) { return null; }
}

function errorFrom(res, json) {
  const e = json && json.error;
  if (e) return new ApiError(e.message || 'The request failed.', { code: e.code, status: res.status, details: e.details, requestId: e.requestId });
  const generic = res.status >= 500 ? 'The server had a problem handling this request. Please try again.' : `The request failed (${res.status}).`;
  return new ApiError(generic, { code: res.status === 404 ? 'NOT_FOUND' : 'HTTP_ERROR', status: res.status });
}

const networkError = () => new ApiError('Could not reach the API server. Check your connection and that the server is running.', { code: 'NETWORK_ERROR', status: 0 });
const sessionExpired = () => new ApiError('Your session has expired. Please sign in again.', { code: 'UNAUTHORIZED', status: 401 });

/* --------------------------------- refresh -------------------------------- */

let refreshing = null;

/** Exchange the refresh token for a new session. Concurrent callers share one request. */
export function refreshSession() {
  if (!refreshing) {
    refreshing = (async () => {
      const s = getSessionSync();
      if (!s || !s.refreshToken) throw sessionExpired();
      let res;
      try {
        res = await fetch(buildUrl('/auth/refresh'), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ refreshToken: s.refreshToken }) });
      } catch (e) { throw networkError(); }
      const json = await readJson(res);
      if (!res.ok || !json || !json.success) throw errorFrom(res, json);
      saveSession(json.data, s.remember);
      return json.data.accessToken;
    })().finally(() => { refreshing = null; });
  }
  return refreshing;
}

/** Drop the local session (route guards then send the user to /login). */
function expire(reason = 'expired') { clearSession(reason); }

/* --------------------------------- request -------------------------------- */

/**
 * request(path, { method, query, body, form, auth, raw, signal, invalidate })
 *   → { data, meta } for JSON responses, or the raw Response when `raw` is true.
 * `form` is a FormData body (multipart; the browser sets the boundary).
 */
export async function request(path, { method = 'GET', query, body, form, auth = true, raw = false, signal, invalidate: bump = true } = {}) {
  const exec = token => {
    const headers = { Accept: raw ? '*/*' : 'application/json' };
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    return fetch(buildUrl(path, query), { method, headers, body: payload, signal }).catch(e => { throw e.name === 'AbortError' ? e : networkError(); });
  };

  let token = auth ? getSessionSync()?.accessToken : null;
  // Refresh a little before the access token expires instead of waiting for a 401.
  const s = auth ? getSessionSync() : null;
  if (s && s.expiresAt && s.expiresAt * 1000 - Date.now() < 30000 && !NO_REFRESH.includes(path)) {
    try { token = await refreshSession(); } catch (e) { if (e.code !== 'NETWORK_ERROR') { expire(); throw sessionExpired(); } }
  }

  let res = await exec(token);
  if (res.status === 401 && auth && token && !NO_REFRESH.includes(path)) {
    try { token = await refreshSession(); } catch (e) { if (e.code === 'NETWORK_ERROR') throw e; expire(); throw sessionExpired(); }
    res = await exec(token);
    if (res.status === 401) { expire(); throw sessionExpired(); }
  }

  if (raw) {
    if (!res.ok) throw errorFrom(res, await readJson(res));
    return res;
  }
  const json = await readJson(res);
  if (!res.ok || !json || json.success === false) {
    const err = errorFrom(res, json);
    if (auth && res.status === 403 && err.code === 'ACCOUNT_SUSPENDED') expire('suspended');
    throw err;
  }
  if (bump && method !== 'GET' && !NO_INVALIDATE.includes(path)) invalidate();
  return { data: json.data, meta: json.meta || {} };
}

export const apiGet = async (path, query) => (await request(path, { query })).data;
export const apiList = async (path, query) => { const r = await request(path, { query }); return { rows: r.data || [], meta: r.meta || {} }; };
export const apiPost = async (path, body) => (await request(path, { method: 'POST', body })).data;
export const apiPatch = async (path, body) => (await request(path, { method: 'PATCH', body })).data;
export const apiDelete = async path => (await request(path, { method: 'DELETE' })).data;

/* --------------------------------- exports -------------------------------- */

function filenameFrom(res, fallback) {
  const cd = res.headers.get('content-disposition') || '';
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) { try { return decodeURIComponent(star[1].trim()); } catch (e) { /* fall through */ } }
  const plain = cd.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : fallback;
}

/** Save a Blob as a file through a temporary object URL. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Download a list endpoint as CSV (`?format=csv`, same filters) with auth, and save it.
 * Returns { filename, size }.
 */
export async function downloadCsv(path, query = {}, fallbackName = 'export') {
  const res = await request(path, { query: { ...query, page: undefined, pageSize: undefined, format: 'csv' }, raw: true });
  const blob = await res.blob();
  const filename = filenameFrom(res, `dts-ai-admin-${fallbackName}-${new Date().toISOString().slice(0, 10)}.csv`);
  saveBlob(blob, filename);
  return { filename, size: blob.size };
}

/** Fetch every page of a list endpoint (for dropdowns such as "all users"). */
export async function listAll(path, query = {}, max = 1000) {
  const pageSize = 200;
  const out = [];
  for (let page = 1; out.length < max; page++) {
    const { rows, meta } = await apiList(path, { ...query, page, pageSize });
    out.push(...rows);
    if (!rows.length || page >= (meta.pageCount || 1)) break;
  }
  return out;
}
