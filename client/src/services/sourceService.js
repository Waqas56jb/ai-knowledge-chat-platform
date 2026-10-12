import { api } from './api';

const SORTS = { newest: ['createdAt', 'desc'], oldest: ['createdAt', 'asc'], title: ['title', 'asc'], updated: ['updatedAt', 'desc'] };

export const sourceService = {
  /** GET /sources → { data: Source[], meta: { page, pageSize, total, pageCount, counts: [{ type, n }] } } */
  list({ q, type = 'all', sort = 'newest', page = 1, pageSize = 12 } = {}, opts) {
    const [s, dir] = SORTS[sort] || SORTS.newest;
    return api.list('/sources', { q: q && q.trim(), type: type === 'all' ? undefined : type, sort: s, dir, page, pageSize }, opts);
  },
  get: id => api.get(`/sources/${id}`),
  download: id => api.get(`/sources/${id}/download`)
};
