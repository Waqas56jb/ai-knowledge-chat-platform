/** Admin-only controllers: processing, conversations review, analytics, audit, settings, search. */
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { toLimitOffset, pageMeta } from '../utils/pagination.js';
import { sendCsv } from '../utils/csv.js';
import * as jobs from '../services/processing.service.js';
import * as conv from '../services/conversation.service.js';
import { getOverview } from '../services/analytics.service.js';
import * as audit from '../services/audit.service.js';
import * as settings from '../services/settings.service.js';
import { adminSearch } from '../services/search.service.js';
import * as gaps from '../services/contentGap.service.js';

/* processing */
const JOB_CSV = [{ key: 'id', label: 'Job ID' }, { key: 'sourceTitle', label: 'Source' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'progress', label: 'Progress' }, { key: 'attempts', label: 'Attempts' }, { key: 'createdAt', label: 'Created' }, { key: 'completedAt', label: 'Completed' }, { key: 'error', label: 'Error' }];
export const listJobs = asyncHandler(async (req, res) => {
  const q = req.validQuery;
  if (q.format === 'csv') return sendCsv(res, 'processing-jobs', (await jobs.listJobs(q, { limit: 10000, offset: 0 })).rows, JOB_CSV);
  const { rows, total } = await jobs.listJobs(q, toLimitOffset(q));
  ok(res, rows, { ...pageMeta(q, total), stats: await jobs.jobStats() });
});
export const getJob = asyncHandler(async (req, res) => ok(res, await jobs.getJob(req.params.id)));
export const retryJob = asyncHandler(async (req, res) => ok(res, await jobs.retryJob(req.params.id, req.user, req), undefined, 202));
export const cancelJob = asyncHandler(async (req, res) => ok(res, await jobs.cancelJob(req.params.id, req.user, req)));

/* conversations (review) */
const CONV_CSV = [{ key: 'title', label: 'Title' }, { key: 'userName', label: 'User' }, { key: 'userEmail', label: 'Email' }, { key: 'messageCount', label: 'Messages' }, { key: 'citationCount', label: 'Citations' }, { key: 'lastOutcome', label: 'Outcome' }, { key: 'reviewStatus', label: 'Review' }, { key: 'createdAt', label: 'Created' }, { key: 'updatedAt', label: 'Updated' }];
export const listConversations = asyncHandler(async (req, res) => {
  const q = req.validQuery;
  if (q.format === 'csv') return sendCsv(res, 'conversations', (await conv.adminListConversations(q, { limit: 10000, offset: 0 })).rows, CONV_CSV);
  const { rows, total } = await conv.adminListConversations(q, toLimitOffset(q));
  ok(res, rows, { ...pageMeta(q, total), stats: await conv.adminConversationStats() });
});
export const getConversation = asyncHandler(async (req, res) => ok(res, await conv.adminGetConversation(req.params.id, req.user, req)));
export const reviewConversation = asyncHandler(async (req, res) => ok(res, await conv.adminReviewConversation(req.params.id, req.body, req.user, req)));

/* analytics */
const SERIES_CSV = [{ key: 'date', label: 'Date' }, { key: 'activeUsers', label: 'Active users' }, { key: 'newUsers', label: 'New users' }, { key: 'conversations', label: 'Conversations' }, { key: 'questions', label: 'Questions' }, { key: 'answeredWithSources', label: 'Answered with sources' }, { key: 'noEvidence', label: 'No evidence' }, { key: 'outOfScope', label: 'Out of scope' }, { key: 'failed', label: 'Errors' }];
const analytics = pick => asyncHandler(async (req, res) => {
  const q = req.validQuery;
  const data = await getOverview(q.range, q.from, q.to);
  if (q.format === 'csv') return sendCsv(res, `analytics-${data.range}`, data.series, SERIES_CSV);
  ok(res, pick ? pick(data) : data);
});
export const analyticsOverview = analytics();
export const analyticsUsers = analytics(d => ({ range: d.range, series: d.series.map(s => ({ date: s.date, label: s.label, totalUsers: s.totalUsers, newUsers: s.newUsers, activeUsers: s.activeUsers })), kpis: { totalUsers: d.kpis.totalUsers, activeUsers: d.kpis.activeUsers, newRegistrations: d.kpis.newRegistrations }, topUsers: d.topUsers }));
export const analyticsConversations = analytics(d => ({ range: d.range, series: d.series.map(s => ({ date: s.date, label: s.label, conversations: s.conversations, questions: s.questions })), kpis: { conversations: d.kpis.conversations, questions: d.kpis.questions } }));
export const analyticsKnowledge = analytics(d => ({ range: d.range, sourceDistribution: d.sourceDistribution, processing: d.processing, topSources: d.topSources, kpis: { sources: d.kpis.sources, processingSuccess: d.kpis.processingSuccess } }));
export const analyticsOutcomes = analytics(d => ({ range: d.range, outcomes: d.outcomes, kpis: { answered: d.kpis.answered, unsupported: d.kpis.unsupported, citationRate: d.kpis.citationRate } }));

/* audit */
const AUDIT_CSV = [{ key: 'created_at', label: 'Timestamp' }, { key: 'actor_name', label: 'Actor', value: r => r.actor_name || r.actor_email || 'System' }, { key: 'action', label: 'Action' }, { key: 'entity_type', label: 'Entity type' }, { key: 'entity_id', label: 'Entity ID' }, { key: 'entity_label', label: 'Target' }, { key: 'result', label: 'Result' }, { key: 'details', label: 'Details' }, { key: 'request_id', label: 'Request ID' }];
export const listAudit = asyncHandler(async (req, res) => {
  const q = req.validQuery;
  if (q.format === 'csv') return sendCsv(res, 'audit-logs', (await audit.listAudit(q, { limit: 20000, offset: 0 })).rows, AUDIT_CSV);
  const { rows, total } = await audit.listAudit(q, toLimitOffset(q));
  ok(res, rows, { ...pageMeta(q, total), actors: await audit.listActors() });
});
export const getAudit = asyncHandler(async (req, res) => {
  const r = await audit.getAudit(req.params.id);
  if (!r) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Audit event not found.', requestId: req.id } });
  ok(res, r);
});

/* settings */
export const getSettings = asyncHandler(async (_req, res) => ok(res, await settings.getSettings()));
export const updateSettings = asyncHandler(async (req, res) => ok(res, { section: req.body.section, values: await settings.updateSection(req.body.section, req.body.values, req.user, req) }));
export const resetSettings = asyncHandler(async (req, res) => ok(res, { section: req.body.section, values: await settings.resetSection(req.body.section, req.user, req) }));

/* search */
export const search = asyncHandler(async (req, res) => ok(res, await adminSearch(req.validQuery.q)));

/* content gaps (unanswered questions) */
const GAP_CSV = [
  { key: 'question', label: 'Question' }, { key: 'status', label: 'Status' }, { key: 'askCount', label: 'Times asked' }, { key: 'userCount', label: 'Users' },
  { key: 'firstAskedAt', label: 'First asked' }, { key: 'lastAskedAt', label: 'Last asked' }, { key: 'answeredSince', label: 'Answered since' }, { key: 'note', label: 'Note' }
];
export const listGaps = asyncHandler(async (req, res) => {
  const q = req.validQuery;
  if (q.format === 'csv') return sendCsv(res, 'unanswered-questions', (await gaps.listGaps(q, { limit: 10000, offset: 0 })).rows, GAP_CSV);
  const { rows, total } = await gaps.listGaps(q, toLimitOffset(q));
  ok(res, rows, { ...pageMeta(q, total), stats: await gaps.gapStats() });
});
export const getGap = asyncHandler(async (req, res) => ok(res, await gaps.getGap(req.params.id)));
export const updateGap = asyncHandler(async (req, res) => ok(res, await gaps.updateGap(req.params.id, req.body, req.user, req)));
