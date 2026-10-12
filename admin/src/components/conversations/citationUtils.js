import { SOURCE_TYPES } from '../../constants/domain';

/** Cited-source states an administrator should know about (the answer may be outdated or unverifiable). */
export const SOURCE_ISSUES = {
  disabled: 'Source disabled',
  failed: 'Source failed processing',
  deleted: 'Source deleted'
};

export const hasSourceIssue = status => !!SOURCE_ISSUES[status];
export const sourceTypeLabel = type => (type && SOURCE_TYPES[type] ? SOURCE_TYPES[type].label : 'Unknown type');

/** DOM id for one citation under one message (target of the [n] marker buttons). */
export const citationDomId = (messageId, n) => `cite-${messageId}-${n}`;

/** Split answer text into text parts and citation markers: [{ text } | { n }]. */
export function splitCitations(text = '') {
  const parts = [];
  const re = /\[(\d+)\]/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ n: Number(m[1]) });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** Aggregate every citation in a conversation by source. */
export function aggregateSources(messages) {
  const map = new Map();
  messages.forEach(m => m.citations.forEach(c => {
    const s = map.get(c.sourceId) || { sourceId: c.sourceId, title: c.sourceTitle, type: c.sourceType, status: c.sourceStatus, count: 0, excerpts: [], messageIds: [] };
    s.count += 1;
    if (!s.excerpts.includes(c.excerpt)) s.excerpts.push(c.excerpt);
    if (!s.messageIds.includes(m.id)) s.messageIds.push(m.id);
    map.set(c.sourceId, s);
  }));
  return [...map.values()].sort((a, b) => b.count - a.count || String(a.title).localeCompare(String(b.title)));
}
