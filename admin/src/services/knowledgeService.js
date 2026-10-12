/**
 * Knowledge sources — /admin/knowledge. The server downloads transcripts, extracts documents,
 * chunks, embeds and indexes; the UI polls while sources are pending or processing.
 */
import { apiDelete, apiGet, apiList, apiPatch, apiPost, downloadCsv, request } from './api';
import { mapAudit } from './auditService';
import { mapJob } from './processingService';
import { normalizeVisibility, sourceTypeLabel } from '../constants/domain';

const fmtDuration = s => {
  if (!s && s !== 0) return null;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

/** Source → UI shape. */
export const mapSource = s => s && ({
  ...s,
  typeLabel: sourceTypeLabel(s.type),
  ownerName: s.ownerName || 'Unknown user',
  description: s.description || '',
  tags: s.tags || [],
  chunkCount: s.chunkCount || 0,
  error: s.errorMessage || null,
  notes: s.notes || '',
  youtube: s.youtube || (s.type === 'youtube' ? { videoId: null, thumbnail: null } : null),
  activeJob: s.activeJob || null
});

const listQuery = ({ q, type, status, owner, ownerId, added, sort, dir, page, pageSize } = {}) =>
  ({ q: q && q.trim(), type, status, ownerId: ownerId || owner, added, sort, dir, page, pageSize });

/** Filters: { q, type, status, owner, added, sort, dir, page, pageSize } → { rows, meta } (meta.stats, meta.owners) */
export async function getKnowledgeSources(filters = {}) {
  const { rows, meta } = await apiList('/admin/knowledge', listQuery(filters));
  return { rows: rows.map(mapSource), meta };
}

export const exportKnowledgeSources = filters => downloadCsv('/admin/knowledge', listQuery(filters), 'knowledge-sources');

/** Every source (for access pickers). */
export async function getAllSources() {
  const out = [];
  for (let page = 1; page < 20; page++) {
    const { rows, meta } = await apiList('/admin/knowledge', { page, pageSize: 200, sort: 'title', dir: 'asc' });
    out.push(...rows.map(mapSource));
    if (page >= (meta.pageCount || 1)) break;
  }
  return out;
}

export async function getSourceById(id) {
  const s = await apiGet(`/admin/knowledge/${encodeURIComponent(id)}`);
  return {
    ...mapSource(s),
    allowedUsers: s.allowedUsers || [],
    allowedUserIds: (s.allowedUsers || []).map(u => u.id),
    jobs: (s.jobs || []).map(mapJob),
    relatedConversations: s.relatedConversations || [],
    content: s.content || null,
    metadata: s.metadata || {},
    /** Client conversations: { at, entries, parts, model } once anonymised and rewritten into playbook lessons. */
    restructured: (s.metadata && s.metadata.restructured) || null,
    channelVideos: s.channelVideos || [],
    durationLabel: fmtDuration(s.durationSeconds),
    activity: (s.activity || []).map(mapAudit)
  };
}

const visibilityFields = p => {
  const visibility = normalizeVisibility(p.visibility);
  const out = { visibility };
  if (visibility === 'restricted') out.allowedUserIds = p.allowedUserIds || [];
  return out;
};

/**
 * Create a source. payload (from the add wizard):
 *   { kind: 'youtube', url, transcript?, maxVideos? (channels), title?, description?, tags, visibility, allowedUserIds }
 *   { kind: 'document', file: File, title?, description?, tags, visibility, allowedUserIds, asConversation?, category? }
 *   { kind: 'text', sourceType, text, title, description?, category?, tags, visibility, allowedUserIds }
 * → { source, jobId }. A 409 duplicate error carries details.existingSourceId.
 */
export async function createKnowledgeSource(payload) {
  const meta = {};
  if (payload.title && payload.title.trim()) meta.title = payload.title.trim();
  if (payload.description && payload.description.trim()) meta.description = payload.description.trim();
  if (payload.tags && payload.tags.length) meta.tags = payload.tags;

  if (payload.kind === 'youtube') {
    const body = { url: payload.url.trim(), ...meta, ...visibilityFields(payload) };
    if (payload.transcript && payload.transcript.trim()) body.transcript = payload.transcript.trim();
    if (payload.maxVideos) body.maxVideos = payload.maxVideos;
    const r = await apiPost('/admin/knowledge/youtube', body);
    return { ...r, source: mapSource(r.source) };
  }
  if (payload.kind === 'document') {
    const form = new FormData();
    form.append('file', payload.file, payload.file.name);
    Object.entries(meta).forEach(([k, v]) => form.append(k, Array.isArray(v) ? JSON.stringify(v) : v));
    const vis = visibilityFields(payload);
    form.append('visibility', vis.visibility);
    if (vis.allowedUserIds) form.append('allowedUserIds', JSON.stringify(vis.allowedUserIds));
    if (payload.asConversation) {
      // a client conversation log (e.g. a WhatsApp export): anonymised and restructured by the server
      form.append('asConversation', 'true');
      if (payload.category) form.append('category', payload.category);
    }
    const { data } = await request('/admin/knowledge/documents', { method: 'POST', form });
    return { ...data, source: mapSource(data.source) };
  }
  const body = { title: payload.title.trim(), text: payload.text, sourceType: payload.sourceType || 'business_knowledge', ...meta, ...visibilityFields(payload) };
  if (payload.category) body.category = payload.category;
  const r = await apiPost('/admin/knowledge/text', body);
  return { ...r, source: mapSource(r.source) };
}

/**
 * Upload several client-conversation files, one request per file (each becomes its own source), and keep
 * going when one fails. `base` = { title?, description?, tags, category, visibility, allowedUserIds };
 * `titleFor(file, index)` names each source. `onUpdate(index, { status: 'uploading'|'done'|'failed', source?, error? })`
 * reports progress. → [{ file, status, source?, error? }]
 */
export async function uploadConversationFiles(files, base, { titleFor, onUpdate } = {}) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onUpdate && onUpdate(i, { status: 'uploading' });
    try {
      const { source } = await createKnowledgeSource({ ...base, kind: 'document', asConversation: true, file, title: titleFor ? titleFor(file, i) : base.title });
      results.push({ file, status: 'done', source });
    } catch (error) {
      results.push({ file, status: 'failed', error });
    }
    onUpdate && onUpdate(i, results[i]);
  }
  return results;
}

/** changes: { title, description, tags, notes, visibility, allowedUserIds } */
export async function updateSource(id, changes) {
  const body = { ...changes };
  if ('visibility' in body) {
    body.visibility = normalizeVisibility(body.visibility);
    if (body.visibility !== 'restricted') body.allowedUserIds = [];
  }
  return mapSource(await apiPatch(`/admin/knowledge/${encodeURIComponent(id)}`, body));
}

/** Index / re-index. */
export const startProcessing = id => apiPost(`/admin/knowledge/${encodeURIComponent(id)}/process`);
/** Failed sources only. */
export const retrySource = id => apiPost(`/admin/knowledge/${encodeURIComponent(id)}/retry`);
export const disableSource = id => apiPost(`/admin/knowledge/${encodeURIComponent(id)}/disable`);
export const enableSource = id => apiPost(`/admin/knowledge/${encodeURIComponent(id)}/enable`);
export const deleteSource = id => apiDelete(`/admin/knowledge/${encodeURIComponent(id)}`);

/** Short-lived signed download URL (documents only) → { url, expiresInSeconds }. */
export const getSourceDownload = id => apiGet(`/admin/knowledge/${encodeURIComponent(id)}/download`);

/** Indexed chunks (GET /sources/:id/chunks) → { rows: [{ id, index, content, tokenCount, startSeconds, endSeconds, pageNumber, url }], meta } */
export const getSourceChunks = (id, page = 1, pageSize = 20) => apiList(`/sources/${encodeURIComponent(id)}/chunks`, { page, pageSize });
