/**
 * The signed-in admin's session as returned by POST /auth/login or /auth/refresh:
 *   { accessToken, refreshToken, expiresAt (unix seconds), tokenType, user: Profile }
 * Kept in localStorage when "Remember me" is checked, otherwise in sessionStorage (cleared with the tab).
 * Subscribers are notified on every change (login, refresh, profile update, logout).
 */
const KEY = 'nexus-admin:session';
const listeners = new Set();
let cached;

function read() {
  try {
    const local = localStorage.getItem(KEY);
    const raw = sessionStorage.getItem(KEY) || local;
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.accessToken || !s.user) return null;
    return { ...s, remember: !!local };
  } catch (e) { return null; }
}

function emit() { listeners.forEach(fn => fn()); }

export function getSessionSync() {
  if (cached === undefined) cached = read();
  return cached;
}

export const getAccessToken = () => getSessionSync()?.accessToken || null;
export const getSessionUser = () => getSessionSync()?.user || null;

/** Store a fresh session from the API. `remember` defaults to the current session's choice. */
export function saveSession(session, remember = getSessionSync()?.remember ?? false) {
  const value = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    tokenType: session.tokenType,
    user: session.user
  };
  try {
    sessionStorage.removeItem(KEY); localStorage.removeItem(KEY);
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(value));
  } catch (e) { /* storage unavailable: keep the session in memory */ }
  cached = { ...value, remember };
  emit();
  return cached;
}

/** Replace the cached profile (after GET /auth/me or PATCH /users/me). */
export function updateSessionUser(user) {
  const s = getSessionSync();
  if (!s) return;
  saveSession({ ...s, user: { ...s.user, ...user } }, s.remember);
}

let signOutReason = null;

/** Forget the session. `reason` ('expired' | 'admin_required' | 'suspended') is shown once on the login page. */
export function clearSession(reason = null) {
  const had = !!getSessionSync();
  try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) { /* storage unavailable */ }
  cached = null;
  if (had && reason) signOutReason = reason;
  if (had) emit();
}

/** Read (and clear) why the last session ended, if it was not a normal sign-out. */
export function takeSignOutReason() { const r = signOutReason; signOutReason = null; return r; }

export function subscribeSession(fn) { listeners.add(fn); return () => listeners.delete(fn); }
