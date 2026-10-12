import { api } from './api';

export const conversationService = {
  /** GET /conversations → { data: Conversation[], meta: { page, pageSize, total, pageCount } } */
  list: ({ q, page = 1, pageSize = 20 } = {}, opts) => api.list('/conversations', { q: q && q.trim(), page, pageSize }, opts),
  get: id => api.get(`/conversations/${id}`),
  rename: (id, title) => api.patch(`/conversations/${id}`, { title }),
  remove: id => api.del(`/conversations/${id}`),
  clearAll: () => api.del('/users/me/conversations'),
  preview: c => (c.preview || '').replace(/\s?\[\d+\]/g, '').replace(/\s+/g, ' ').trim() || 'No messages yet'
};
