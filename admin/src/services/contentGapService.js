/**
 * Unanswered questions (content gaps) — /admin/content-gaps.
 * Questions the knowledge base could not answer, grouped case- and punctuation-insensitively, with a
 * triage status so the team can plan new content. Derived from conversations: if a user deletes a
 * conversation, its questions disappear from here.
 */
import { apiGet, apiList, apiPatch, downloadCsv } from './api';

export const GAP_STATUSES = ['open', 'planned', 'covered', 'dismissed'];
export const GAP_STATUS_LABELS = { open: 'Open', planned: 'Planned', covered: 'Covered', dismissed: 'Dismissed' };

const mapGap = g => g && ({ ...g, note: g.note || '', askCount: g.askCount || 0, userCount: g.userCount || 0 });

const listQuery = ({ q, status, range, sort, dir, page, pageSize } = {}) => ({ q: q && q.trim(), status, range, sort, dir, page, pageSize });

/** Filters: { q, status, range, sort, dir, page, pageSize } → { rows, meta } (meta.stats) */
export async function getContentGaps(filters = {}) {
  const { rows, meta } = await apiList('/admin/content-gaps', listQuery(filters));
  return { rows: rows.map(mapGap), meta };
}

/** stats: { total, open, planned, covered, dismissed, askedLast7Days, unansweredQuestions } */
export async function getContentGapStats() {
  const { meta } = await apiList('/admin/content-gaps', { pageSize: 1 });
  return { total: 0, open: 0, planned: 0, covered: 0, dismissed: 0, askedLast7Days: 0, unansweredQuestions: 0, ...(meta.stats || {}) };
}

export const exportContentGaps = filters => downloadCsv('/admin/content-gaps', listQuery(filters), 'unanswered-questions');

/** Detail with `occurrences` (newest first). */
export async function getContentGapById(id) {
  const g = await apiGet(`/admin/content-gaps/${encodeURIComponent(id)}`);
  return { ...mapGap(g), occurrences: g.occurrences || [] };
}

/** changes: { status?, note? } (note '' clears it) → detail */
export async function updateContentGap(id, changes) {
  const g = await apiPatch(`/admin/content-gaps/${encodeURIComponent(id)}`, changes);
  return { ...mapGap(g), occurrences: g.occurrences || [] };
}
