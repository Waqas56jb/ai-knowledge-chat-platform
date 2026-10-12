import { store } from '../utils/storage';
import { api } from './api';

/**
 * UI preferences. The source of truth is `preferences` on the user's profile (PATCH /users/me);
 * a local copy is kept only so the theme is right before the profile loads.
 */
export const settingsService = {
  defaults: { theme: 'dark', density: 'comfortable', enterToSend: true, showCitations: true, defaultScope: 'all', showFollowups: true },
  keys() { return Object.keys(this.defaults); },
  /** Merge defaults with server preferences (or the local cache when signed out). */
  resolve(prefs) { return { ...this.defaults, ...(prefs || store.get('settings', {})) }; },
  cache(s) { store.set('settings', s); },
  /** PATCH /users/me { preferences } — preferences are replaced as a whole, so send the full object. */
  save: preferences => api.patch('/users/me', { preferences }),
  apply(s) {
    const sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = s.theme === 'system' ? (sysDark ? 'dark' : 'light') : s.theme;
    document.documentElement.dataset.density = s.density;
  }
};
