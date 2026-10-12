/** Global search — GET /admin/search?q= → { users, invitations, sources, conversations, jobs, total }. */
import { apiGet } from './api';

export const SEARCH_GROUPS = [['users', 'Users'], ['invitations', 'Invitations'], ['sources', 'Knowledge sources'], ['conversations', 'Conversations'], ['jobs', 'Processing jobs']];

const EMPTY = { users: [], invitations: [], sources: [], conversations: [], jobs: [], total: 0 };

export async function globalSearch(q) {
  const term = String(q || '').trim();
  if (!term) return EMPTY;
  const r = await apiGet('/admin/search', { q: term.slice(0, 100) });
  const out = { ...EMPTY, ...r };
  SEARCH_GROUPS.forEach(([k]) => { out[k] = out[k] || []; });
  out.total = r.total ?? SEARCH_GROUPS.reduce((n, [k]) => n + out[k].length, 0);
  return out;
}
