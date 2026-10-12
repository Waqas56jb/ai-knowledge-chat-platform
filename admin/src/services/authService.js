/**
 * Admin authentication against the API (/auth/*). Only users with role `admin` may use the console.
 */
import { ApiError, buildUrl, request, apiGet, apiPatch } from './api';
import { clearSession, getSessionSync, saveSession, updateSessionUser } from './sessionStore';

export const getSession = getSessionSync;
export const isAuthenticated = () => !!getSessionSync();

const adminRequired = () => new ApiError('Admin access required. This console is only available to administrator accounts.', { code: 'FORBIDDEN', status: 403 });

/** POST /auth/login → stores the session when the user is an active admin. Returns { ok, session } | { ok: false, error, code }. */
export async function login(email, password, remember = false) {
  try {
    const { data } = await request('/auth/login', { method: 'POST', body: { email: email.trim(), password }, auth: false });
    if (!data || !data.user || data.user.role !== 'admin') {
      // sign the non-admin session out on the server too, then forget it
      if (data && data.accessToken) {
        await fetchLogout(data.accessToken);
      }
      clearSession();
      return { ok: false, code: 'ADMIN_REQUIRED', error: adminRequired().message };
    }
    const session = saveSession(data, remember);
    return { ok: true, session };
  } catch (err) {
    return { ok: false, code: err.code, error: err.message };
  }
}

async function fetchLogout(accessToken) {
  try {
    await fetch(buildUrl('/auth/logout'), { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
  } catch (e) { /* best effort */ }
}

/** POST /auth/logout (best effort), then clear the local session. */
export async function logout(reason = null) {
  if (getSessionSync()) {
    try { await request('/auth/logout', { method: 'POST' }); } catch (e) { /* the local session is cleared regardless */ }
  }
  clearSession(reason);
}

/** GET /auth/me — refreshes the cached profile; signs out when the user is no longer an admin. */
export async function loadCurrentUser() {
  const data = await apiGet('/auth/me');
  if (!data || !data.user || data.user.role !== 'admin') {
    await logout('admin_required');
    throw adminRequired();
  }
  updateSessionUser(data.user);
  return data;
}

/** POST /auth/forgot-password (always succeeds for privacy). */
export async function requestPasswordReset(email) {
  const { data } = await request('/auth/forgot-password', { method: 'POST', body: { email: email.trim() }, auth: false });
  return { ok: true, email: email.trim(), message: data?.message };
}

/* ------------------------------ own profile ------------------------------ */

/** GET /users/me */
export const getMyProfile = () => apiGet('/users/me');

/** PATCH /users/me { fullName, department, timezone, language, avatarUrl, preferences } */
export async function updateMyProfile(changes) {
  const user = await apiPatch('/users/me', changes);
  updateSessionUser(user);
  return user;
}

/** Display name for the signed-in admin. */
export const sessionName = s => (s && s.user ? s.user.fullName || s.user.email : '');

/** GET /auth/me → { user, settings: PublicSettings } (platform defaults used by forms). */
export const getMe = () => apiGet('/auth/me');
