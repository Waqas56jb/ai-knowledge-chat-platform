/**
 * Creating knowledge sources (YouTube video/channel, documents, text) and queueing their processing.
 * Nothing is marked "indexed" here — that happens only when the pipeline (jobs/processSource.job.js)
 * completes every step.
 */
import { one, tx } from '../config/database.js';
import { T } from '../config/constants.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { sha256, cleanText } from '../utils/sanitize.js';
import { recordAudit } from './audit.service.js';
import { enqueueJob, firstJobType } from './processing.service.js';
import { parseYouTubeUrl, fetchVideoMetadata, resolveChannelId, listChannelVideos } from './youtube.service.js';
import { parseManualTranscript } from './transcript.service.js';
import { detectDocumentType, storeDocument, removeDocument } from './document.service.js';
import { getSettings } from './settings.service.js';

async function assertTypeEnabled(type) {
  const s = await getSettings();
  if (!s.knowledge.supportedTypes.includes(type)) throw ApiError.validation(`Adding ${type} sources is disabled in Knowledge settings.`);
}

async function insertSource(db, s, actor) {
  const r = (await db.query(
    `insert into ${T.sources} (title, description, source_type, source_url, channel_name, duration_seconds, visibility, status, metadata, tags, content_hash, owner_id, created_by, storage_path)
     values ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11,$11,$12) returning *`,
    [s.title, s.description || '', s.sourceType, s.sourceUrl || null, s.channelName || null, s.durationSeconds || null, s.visibility || 'workspace',
      JSON.stringify(s.metadata || {}), s.tags || [], s.contentHash || null, actor.id, s.storagePath || null])).rows[0];
  if (s.visibility === 'restricted' && s.allowedUserIds?.length) {
    await db.query(`insert into ${T.sourceAccess} (source_id, user_id) select $1, p.id from ${T.profiles} p where p.id = any($2::uuid[]) on conflict do nothing`, [r.id, s.allowedUserIds]);
  }
  return r;
}

async function assertNoDuplicateContent(hash) {
  const dup = await one(`select id, title from ${T.sources} where content_hash = $1 limit 1`, [hash]);
  if (dup) throw ApiError.conflict(`This content already exists as "${dup.title}".`, { existingSourceId: dup.id });
}

/** payload: { url, title?, description?, tags?, visibility?, allowedUserIds?, transcript? (manual text), maxVideos? (channels) } */
export async function createYoutubeSource(payload, actor, req) {
  await assertTypeEnabled('youtube');
  const parsed = parseYouTubeUrl(payload.url);

  if (parsed.kind === 'channel') {
    const channelId = await resolveChannelId(parsed);
    const dup = await one(`select id, title from ${T.sources} where source_type = 'youtube' and metadata ->> 'channelId' = $1 and metadata ->> 'kind' = 'channel'`, [channelId]);
    if (dup) throw ApiError.conflict(`This channel was already added as "${dup.title}".`, { existingSourceId: dup.id });
    const feed = await listChannelVideos(channelId, 1).catch(() => ({ channelName: '' }));
    return tx(async db => {
      const s = await insertSource(db, {
        title: payload.title || feed.channelName || 'YouTube channel', description: payload.description, sourceType: 'youtube',
        sourceUrl: `https://www.youtube.com/channel/${channelId}`, channelName: feed.channelName || null,
        visibility: payload.visibility, allowedUserIds: payload.allowedUserIds, tags: payload.tags,
        metadata: { kind: 'channel', channelId, maxVideos: payload.maxVideos || env.CHANNEL_MAX_VIDEOS }
      }, actor);
      const job = await enqueueJob(db, { sourceId: s.id, jobType: 'channel_discovery', requestedBy: actor.id });
      await recordAudit({ actor, action: 'source.added', entityType: 'source', entityId: s.id, entityLabel: s.title, details: { type: 'youtube_channel', channelId }, req }, db);
      return { source: s, job };
    });
  }

  const dup = await one(`select id, title from ${T.sources} where source_type = 'youtube' and metadata ->> 'videoId' = $1`, [parsed.videoId]);
  if (dup) throw ApiError.conflict(`This video was already added as "${dup.title}".`, { existingSourceId: dup.id });
  const meta = await fetchVideoMetadata(parsed.videoId);
  const manual = payload.transcript ? parseManualTranscript(cleanText(payload.transcript, { maxLength: env.MAX_SOURCE_CHARACTERS })) : null;
  if (manual && !manual.segments.length) throw ApiError.validation('The pasted transcript is empty.');

  return tx(async db => {
    const s = await insertSource(db, {
      title: payload.title || meta.title || `YouTube video ${parsed.videoId}`, description: payload.description, sourceType: 'youtube',
      sourceUrl: parsed.url, channelName: meta.channelName, visibility: payload.visibility, allowedUserIds: payload.allowedUserIds, tags: payload.tags,
      metadata: { kind: 'video', videoId: parsed.videoId, thumbnail: meta.thumbnail, manualTranscript: !!manual }
    }, actor);
    if (manual) {
      await db.query(`insert into ${T.sourceContents} (source_id, content, segments, provider) values ($1, $2, $3, 'manual')`,
        [s.id, manual.segments.map(x => x.text).join('\n'), JSON.stringify(manual.segments)]);
    }
    const job = await enqueueJob(db, { sourceId: s.id, jobType: 'transcript_extraction', requestedBy: actor.id });
    await recordAudit({ actor, action: 'source.added', entityType: 'source', entityId: s.id, entityLabel: s.title, details: { type: 'youtube', videoId: parsed.videoId, manualTranscript: !!manual }, req }, db);
    return { source: s, job };
  });
}

/** file: multer file (memory). fields: { title?, description?, tags?, visibility?, allowedUserIds? } */
export async function createDocumentSource(file, fields, actor, req) {
  if (!file) throw ApiError.validation('Attach a file in the "file" field.');
  const type = detectDocumentType(file.buffer, file.originalname);
  await assertTypeEnabled(type);
  const { platform } = await getSettings();
  if (file.size > platform.maxFileSizeMb * 1024 * 1024) throw new ApiError(413, 'FILE_TOO_LARGE', `The file is larger than ${platform.maxFileSizeMb} MB.`);
  const hash = sha256(file.buffer);
  await assertNoDuplicateContent(hash);
  const title = (fields.title || file.originalname.replace(/\.[^.]+$/, '')).slice(0, 300);

  // 1) create the record, 2) store the private file, 3) queue the job — rolling back on failure
  const s = await tx(db => insertSource(db, {
    title, description: fields.description, sourceType: type, visibility: fields.visibility, allowedUserIds: fields.allowedUserIds, tags: fields.tags,
    contentHash: hash, metadata: { kind: 'document', file: { name: file.originalname.slice(0, 200), size: file.size, type } }
  }, actor));
  let path = null;
  try {
    path = await storeDocument(s.id, file.buffer, file.originalname, type);
    return await tx(async db => {
      await db.query(`update ${T.sources} set storage_path = $2 where id = $1`, [s.id, path]);
      const job = await enqueueJob(db, { sourceId: s.id, jobType: 'document_extraction', requestedBy: actor.id });
      await recordAudit({ actor, action: 'source.added', entityType: 'source', entityId: s.id, entityLabel: title, details: { type, size: file.size }, req }, db);
      return { source: { ...s, storage_path: path }, job };
    });
  } catch (e) {
    await one(`delete from ${T.sources} where id = $1 returning id`, [s.id]).catch(() => {});
    if (path) await removeDocument(path);
    throw e;
  }
}

/** payload: { title, description?, text, sourceType: business_knowledge|txt|markdown|client_conversation, category?, tags?, visibility?, allowedUserIds? } */
export async function createTextSource(payload, actor, req) {
  await assertTypeEnabled(payload.sourceType);
  const text = cleanText(payload.text, { maxLength: env.MAX_SOURCE_CHARACTERS });
  if (text.length < 20) throw ApiError.validation('The text is too short to index (at least 20 characters).');
  const hash = sha256(text);
  await assertNoDuplicateContent(hash);
  const visibility = payload.sourceType === 'client_conversation' && !payload.visibility ? 'restricted' : payload.visibility;
  return tx(async db => {
    const s = await insertSource(db, {
      title: payload.title, description: payload.description, sourceType: payload.sourceType, visibility, allowedUserIds: payload.allowedUserIds,
      tags: payload.tags, contentHash: hash, metadata: { kind: 'text', category: payload.category || null }
    }, actor);
    await db.query(`insert into ${T.sourceContents} (source_id, content, provider) values ($1, $2, 'text')`, [s.id, text]);
    const job = await enqueueJob(db, { sourceId: s.id, jobType: 'text_normalization', requestedBy: actor.id });
    await recordAudit({ actor, action: 'source.added', entityType: 'source', entityId: s.id, entityLabel: s.title, details: { type: payload.sourceType, characters: text.length }, req }, db);
    return { source: s, job };
  });
}

/** Queue (re)processing. `retry` links the new job to the latest failed/cancelled job. */
export async function queueProcessing(sourceId, actor, req, { retry = false } = {}) {
  const s = await one(`select id, title, source_type, status, metadata from ${T.sources} where id = $1`, [sourceId]);
  if (!s) throw ApiError.notFound('Source not found.');
  if (s.status === 'disabled') throw ApiError.conflict('Re-enable the source before processing it.');
  if (s.status === 'processing') throw ApiError.conflict('This source is already being processed.');
  if (retry && s.status !== 'failed') throw ApiError.conflict('Only failed sources can be retried.');
  const last = await one(`select id from ${T.jobs} where source_id = $1 and status in ('failed','cancelled') order by created_at desc limit 1`, [sourceId]);
  const job = await tx(async db => {
    const j = await enqueueJob(db, { sourceId, jobType: firstJobType(s.source_type, s.metadata?.kind === 'channel'), requestedBy: actor.id, parentJobId: retry && last ? last.id : null });
    await recordAudit({ actor, action: retry ? 'job.retried' : 'job.started', entityType: 'job', entityId: j.id, entityLabel: s.title, details: { sourceId, reindex: s.status === 'indexed' }, req }, db);
    return j;
  });
  return job;
}
