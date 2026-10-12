/**
 * Conversations — administrative review via /admin/conversations. Every detail view is written to the
 * audit log by the server.
 */
import { apiGet, apiList, apiPost, downloadCsv } from './api';
import { mapAudit } from './auditService';
import { sourceTypeLabel } from '../constants/domain';

/** List row → UI shape. */
export const mapConversation = c => c && ({
  ...c,
  outcome: c.lastOutcome || null,
  userName: c.userName || c.userEmail || 'Deleted user',
  messageCount: c.messageCount || 0,
  citationCount: c.citationCount || 0,
  sourceCount: c.sourceCount || 0
});

const listQuery = ({ q, userId, sourceGroup, outcome, review, range, sort, dir, page, pageSize } = {}) =>
  ({ q: q && q.trim(), userId, sourceGroup, outcome, review, range, sort, dir, page, pageSize });

/** Filters: { q, userId, sourceGroup, outcome, review (status | 'flagged'), range, sort, dir, page, pageSize } → { rows, meta } */
export async function getConversations(filters = {}) {
  const { rows, meta } = await apiList('/admin/conversations', listQuery(filters));
  return { rows: rows.map(mapConversation), meta };
}

export const exportConversations = filters => downloadCsv('/admin/conversations', listQuery(filters), 'conversations');

/** stats: { total, needsReview, unreviewed } */
export async function getConversationStats() {
  const { meta } = await apiList('/admin/conversations', { pageSize: 1 });
  const s = meta.stats || {};
  return { total: s.total ?? 0, needsReview: s.needs_review ?? 0, unreviewed: s.unreviewed ?? 0 };
}

/** Detail with messages (citations enriched with the cited source's current status), notes and activity. */
export function mapConversationDetail(c) {
  const sources = new Map((c.sources || []).map(s => [s.id, s]));
  const messages = (c.messages || []).map(m => ({
    ...m,
    text: m.content || '',
    at: m.createdAt,
    citations: (m.citations || []).map(ci => {
      const s = sources.get(ci.sourceId);
      return {
        ...ci,
        sourceTitle: ci.sourceTitle || (s && s.title) || 'Deleted source',
        sourceType: ci.sourceType || (s && s.type) || null,
        sourceStatus: s ? s.status : 'deleted'
      };
    })
  }));
  return {
    ...mapConversation(c),
    userName: (c.user && c.user.name) || c.userName || c.userEmail || 'Deleted user',
    messages,
    sources: c.sources || [],
    reviewNotes: (c.reviewNotes || []).map(n => ({ ...n, text: n.note, at: n.createdAt, authorName: n.authorName || 'Former administrator' })),
    activity: (c.activity || []).map(mapAudit)
  };
}

export async function getConversationById(id) {
  return mapConversationDetail(await apiGet(`/admin/conversations/${encodeURIComponent(id)}`));
}

/** POST /:id/review { status } */
export async function setReviewStatus(id, status) {
  return mapConversationDetail(await apiPost(`/admin/conversations/${encodeURIComponent(id)}/review`, { status }));
}

/** POST /:id/review { note } */
export async function addReviewNote(id, text) {
  const note = String(text || '').trim();
  return mapConversationDetail(await apiPost(`/admin/conversations/${encodeURIComponent(id)}/review`, { note }));
}

export { sourceTypeLabel };
