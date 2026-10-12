/**
 * Single HTTP client for the NEXUS AI API.
 * - Base URL from VITE_API_BASE_URL; Bearer access token from the stored session.
 * - Unwraps the { success, data, meta } envelope; failures throw ApiError { code, status, details }.
 * - On 401 it refreshes once (deduplicated across concurrent requests) and retries;
 *   if the refresh fails the session is cleared and the app is sent to /login.
 */
import { sessionStore, store } from '../utils/storage';

export const API_BASE = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, { code = 'UNKNOWN', status = 0, details = null, requestId = null } = {}) {
    super(message);
    this.name = 'ApiError'; this.code = code; this.status = status; this.details = details; this.requestId = requestId;
  }
}

/* ---------- session (accessToken, refreshToken, expiresAt, user) ---------- */
const KEY = 'session';
let cached;
export const sessionStorageApi = {
  get() {
    if (cached !== undefined) return cached;
    cached = store.get(KEY, null) || sessionStore.get(KEY, null) || null;
    return cached;
  },
  /** remember=false keeps the session for this tab only. When omitted, keeps the current choice. */
  set(s, remember) {
    const prev = this.get();
    const keep = remember !== undefined ? remember : (prev ? prev.remember !== false : true);
    cached = { accessToken: s.accessToken, refreshToken: s.refreshToken, expiresAt: s.expiresAt, user: s.user || (prev && prev.user) || null, remember: keep };
    if (keep) { store.set(KEY, cached); sessionStore.del(KEY); } else { sessionStore.set(KEY, cached); store.del(KEY); }
    return cached;
  },
  setUser(user) { const s = this.get(); if (!s) return; this.set({ ...s, user }); },
  clear() { cached = null; store.del(KEY); sessionStore.del(KEY); }
};

/* The app registers a handler so a failed refresh can update React state and route to /login. */
let onSessionLost = () => { try { window.location.assign('/login'); } catch (e) { /* no window */ } };
export const setSessionLostHandler = fn => { onSessionLost = fn; };

let refreshing = null;
async function refreshSession() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const s = sessionStorageApi.get();
    if (!s || !s.refreshToken) throw new ApiError('Your session has ended. Sign in again.', { code: 'UNAUTHORIZED', status: 401 });
    const data = await raw('/auth/refresh', { method: 'POST', body: { refreshToken: s.refreshToken } }).then(r => r.data);
    return sessionStorageApi.set(data);
  })().finally(() => { refreshing = null; });
  return refreshing;
}

function qs(query) {
  if (!query) return '';
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); });
  const s = p.toString();
  return s ? '?' + s : '';
}

/** One HTTP round trip; returns { data, meta } or throws ApiError. */
async function raw(path, { method = 'GET', body, query, token, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  let res;
  try {
    res = await fetch(API_BASE + path + qs(query), { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal });
  } catch (e) {
    if (e && e.name === 'AbortError') throw e;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', { code: 'NETWORK_ERROR', status: 0 });
  }
  let json = null;
  try { json = await res.json(); } catch (e) { /* empty or non-JSON body */ }
  if (!res.ok || !json || json.success === false) {
    const err = (json && json.error) || {};
    throw new ApiError(err.message || `Request failed (${res.status}).`, { code: err.code || 'HTTP_' + res.status, status: res.status, details: err.details || null, requestId: err.requestId || null });
  }
  return { data: json.data, meta: json.meta || null };
}

/**
 * POST that answers with Server-Sent Events. Calls onEvent(name, data) per event and resolves when the stream ends.
 * Errors before the stream starts are ordinary JSON errors and throw ApiError like raw().
 */
async function rawStream(path, { body, token, signal, onEvent } = {}) {
  const headers = { Accept: 'text/event-stream', 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  let res;
  try {
    res = await fetch(API_BASE + path, { method: 'POST', headers, body: JSON.stringify(body || {}), signal });
  } catch (e) {
    if (e && e.name === 'AbortError') throw e;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', { code: 'NETWORK_ERROR', status: 0 });
  }
  if (!res.ok || !res.body || !(res.headers.get('Content-Type') || '').includes('text/event-stream')) {
    let json = null;
    try { json = await res.json(); } catch (e) { /* empty or non-JSON body */ }
    const err = (json && json.error) || {};
    throw new ApiError(err.message || `Request failed (${res.status}).`, { code: err.code || 'HTTP_' + res.status, status: res.status, details: err.details || null, requestId: err.requestId || null });
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  const dispatch = block => {
    let event = 'message', data = '';
    block.split('\n').forEach(l => {
      if (l.startsWith('event:')) event = l.slice(6).trim();
      else if (l.startsWith('data:')) data += l.slice(5).trim();
    });
    if (!data) return;
    let parsed;
    try { parsed = JSON.parse(data); } catch (e) { return; /* malformed event */ }
    onEvent(event, parsed);
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value.replace(/\r/g, '');
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) { dispatch(buf.slice(0, i)); buf = buf.slice(i + 2); }
    }
  } catch (e) {
    if (e instanceof ApiError || (e && e.name === 'AbortError')) throw e;
    throw new ApiError('The connection was interrupted. Please try again.', { code: 'NETWORK_ERROR', status: 0 });
  }
  if (buf.trim()) dispatch(buf);
  return { data: null, meta: null };
}

/**
 * Authenticated request with refresh-once-on-401. `auth: false` for public endpoints.
 * Returns { data, meta }.
 */
export async function request(path, opts = {}) {
  const { auth = true } = opts;
  const call = opts.onEvent ? rawStream : raw;
  if (!auth) return call(path, opts);
  let s = sessionStorageApi.get();
  // refresh proactively when the access token is about to expire
  if (s && s.refreshToken && s.expiresAt && s.expiresAt * 1000 < Date.now() + 30000) {
    try { s = await refreshSession(); } catch (e) { /* fall through: the 401 path below decides */ }
  }
  try {
    return await call(path, { ...opts, token: s && s.accessToken });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401 || e.code === 'INVALID_CREDENTIALS') throw e;
    let fresh;
    try { fresh = await refreshSession(); } catch (re) {
      sessionStorageApi.clear();
      onSessionLost();
      throw new ApiError('Your session has ended. Sign in again.', { code: 'UNAUTHORIZED', status: 401 });
    }
    return call(path, { ...opts, token: fresh.accessToken });
  }
}

export const api = {
  get: (path, query, opts) => request(path, { ...opts, query }).then(r => r.data),
  list: (path, query, opts) => request(path, { ...opts, query }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body: body === undefined ? {} : body }).then(r => r.data),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }).then(r => r.data),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }).then(r => r.data),
  /** POST answered with Server-Sent Events; onEvent(name, data) per event. */
  stream: (path, body, onEvent, opts) => request(path, { ...opts, method: 'POST', body, onEvent })
};
