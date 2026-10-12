/**
 * Settings.
 * - Server sections (`platform`, `knowledge`, `security`, `domain_policy`, `chat`) live in
 *   /admin/settings: GET all, PATCH { section, values }, POST /reset { section }.
 * - `profile` is the signed-in admin's own profile (GET/PATCH /users/me).
 * - `appearance` (theme, sidebar default, density) is a personal display preference kept in this
 *   browser's localStorage; it is not server data.
 */
import { apiGet, apiPatch, apiPost } from './api';
import { getMyProfile, updateMyProfile } from './authService';

export const SERVER_SECTIONS = ['platform', 'knowledge', 'security', 'domain_policy', 'chat'];

/* ------------------------------- server sections ------------------------------- */

/** GET /admin/settings → { platform, knowledge, security, domain_policy, chat } */
export const fetchServerSettings = () => apiGet('/admin/settings');

/** PATCH /admin/settings { section, values } → the saved values of that section. */
export async function updateServerSection(section, values) {
  const r = await apiPatch('/admin/settings', { section, values });
  return r.values;
}

/** POST /admin/settings/reset { section } → the section's default values. */
export async function resetServerSection(section) {
  const r = await apiPost('/admin/settings/reset', { section });
  return r.values;
}

/* ----------------------------------- profile ----------------------------------- */

export const AVATAR_COLOR_KEY = 'avatarColor';

/** Profile → form values. */
const profileValues = p => ({
  name: p.fullName || '',
  email: p.email || '',
  department: p.department || '',
  timezone: p.timezone || 'UTC',
  language: p.language || 'English',
  avatarColor: (p.preferences && p.preferences[AVATAR_COLOR_KEY]) || 'gold'
});

export async function fetchProfileSettings() { return profileValues(await getMyProfile()); }

export async function updateProfileSettings(values, current) {
  const prefs = { ...((current && current.preferences) || {}), [AVATAR_COLOR_KEY]: values.avatarColor };
  const user = await updateMyProfile({ fullName: values.name.trim(), department: values.department?.trim() || '', timezone: values.timezone, language: values.language, preferences: prefs });
  return profileValues(user);
}

/* ---------------------------------- appearance ---------------------------------- */

const APPEARANCE_KEY = 'nexus-admin:appearance';
export const APPEARANCE_DEFAULTS = { theme: 'light', sidebar: 'expanded', density: 'comfortable' };
const listeners = new Set();
export const subscribeAppearance = fn => { listeners.add(fn); return () => listeners.delete(fn); };

export function getAppearance() {
  try { return { ...APPEARANCE_DEFAULTS, ...JSON.parse(localStorage.getItem(APPEARANCE_KEY) || '{}') }; } catch (e) { return { ...APPEARANCE_DEFAULTS }; }
}

export function saveAppearance(values) {
  const next = { ...getAppearance(), ...values };
  try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next)); } catch (e) { /* storage unavailable */ }
  applyAppearance(next);
  listeners.forEach(fn => fn());
  return next;
}

export const resetAppearance = () => saveAppearance(APPEARANCE_DEFAULTS);

/** Apply theme + density to <html>. Theme "system" follows the OS preference. */
export function applyAppearance(appearance = getAppearance()) {
  const root = document.documentElement;
  const dark = appearance.theme === 'dark' || (appearance.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
  root.classList.toggle('density-compact', appearance.density === 'compact');
}

/**
 * Forget the user's manual sidebar toggle so the saved appearance default applies on the next load.
 * (The layout reads 'nexus-admin:sidebar' before the appearance setting.)
 */
export function clearSidebarPreference() {
  try { localStorage.removeItem('nexus-admin:sidebar'); } catch (e) { /* storage unavailable */ }
}

/* ------------------------------ form adapters ------------------------------ */

/**
 * load/save/reset per settings page, used by useSettingsForm.
 * `reset` is omitted where "reset to defaults" has no meaning (profile).
 */
export const SETTINGS_ADAPTERS = {
  profile: {
    load: fetchProfileSettings,
    save: async values => updateProfileSettings(values, await getMyProfile())
  },
  appearance: {
    load: async () => getAppearance(),
    save: async values => saveAppearance(values),
    reset: async () => resetAppearance()
  },
  ...Object.fromEntries(SERVER_SECTIONS.map(section => [section, {
    load: async () => (await fetchServerSettings())[section],
    save: values => updateServerSection(section, values),
    reset: () => resetServerSection(section)
  }]))
};
