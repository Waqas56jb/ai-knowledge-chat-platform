import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { toLimitOffset, pageMeta } from '../utils/pagination.js';
import { sendCsv } from '../utils/csv.js';
import { ApiError } from '../utils/ApiError.js';
import * as src from '../services/source.service.js';
import * as ingest from '../services/ingestion.service.js';
import { documentFields } from '../schemas/index.js';

/* user-facing */
export const list = asyncHandler(async (req, res) => {
  const q = req.validQuery;
  const { rows, total, counts } = await src.listAccessibleSources(req.user, q, toLimitOffset(q));
  ok(res, rows, { ...pageMeta(q, total), counts });
});
export const get = asyncHandler(async (req, res) => ok(res, await src.getAccessibleSource(req.user, req.params.sourceId)));
export const chunks = asyncHandler(async (req, res) => {
  const q = req.validQuery;
  const { rows, total } = await src.listChunks(req.user, req.params.sourceId, toLimitOffset(q));
  ok(res, rows, pageMeta(q, total));
});
export const download = asyncHandler(async (req, res) => ok(res, { url: await src.sourceDownloadUrl(req.user, req.params.sourceId), expiresInSeconds: 120 }));

/* admin */
const CSV = [
  { key: 'title', label: 'Title' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'visibility', label: 'Visibility' },
  { key: 'ownerName', label: 'Owner' }, { key: 'chunkCount', label: 'Chunks' }, { key: 'tags', label: 'Tags' }, { key: 'createdAt', label: 'Added' }, { key: 'updatedAt', label: 'Updated' }
];
export const adminList = asyncHandler(async (req, res) => {
  const q = req.validQuery;
  if (q.format === 'csv') return sendCsv(res, 'knowledge-sources', (await src.adminListSources(q, { limit: 10000, offset: 0 })).rows, CSV);
  const { rows, total } = await src.adminListSources(q, toLimitOffset(q));
  ok(res, rows, { ...pageMeta(q, total), stats: await src.knowledgeStats(), owners: await src.sourceOwners() });
});
export const adminGet = asyncHandler(async (req, res) => ok(res, await src.adminGetSource(req.params.sourceId)));
export const adminUpdate = asyncHandler(async (req, res) => ok(res, await src.updateSource(req.params.sourceId, req.body, req.user, req)));
export const adminDelete = asyncHandler(async (req, res) => { await src.deleteSource(req.params.sourceId, req.user, req); ok(res, { deleted: true }); });
export const adminBulk = asyncHandler(async (req, res) => ok(res, await src.bulkSetCitations(req.body.ids, req.body.action === 'hide_citations', req.user, req)));
export const adminDisable = asyncHandler(async (req, res) => ok(res, await src.setSourceEnabled(req.params.sourceId, false, req.user, req)));
export const adminEnable = asyncHandler(async (req, res) => ok(res, await src.setSourceEnabled(req.params.sourceId, true, req.user, req)));
export const adminProcess = asyncHandler(async (req, res) => ok(res, await ingest.queueProcessing(req.params.sourceId, req.user, req), undefined, 202));
export const adminRetry = asyncHandler(async (req, res) => ok(res, await ingest.queueProcessing(req.params.sourceId, req.user, req, { retry: true }), undefined, 202));

const created = async (res, p) => { const r = await p; ok(res, { source: src.sourceOut(r.source), jobId: r.job.id }, undefined, 201); };
export const addYoutube = asyncHandler(async (req, res) => created(res, ingest.createYoutubeSource(req.body, req.user, req)));
export const addText = asyncHandler(async (req, res) => created(res, ingest.createTextSource(req.body, req.user, req)));
export const addDocument = asyncHandler(async (req, res) => {
  const f = documentFields.safeParse(req.body || {});
  if (!f.success) throw ApiError.validation(f.error.issues[0]?.message);
  await created(res, ingest.createDocumentSource(req.file, f.data, req.user, req));
});
