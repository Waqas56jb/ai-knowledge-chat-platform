/**
 * The ingestion pipeline for one claimed job:
 *   fetch/extract → normalise → chunk → embed (batched) → replace the source's chunks in one transaction → indexed.
 * Any failure leaves the previous index untouched (the swap is transactional) and the source is not marked indexed.
 */
import { one, many, tx, toVector, query } from '../config/database.js';
import { T } from '../config/constants.js';
import { env } from '../config/env.js';
import { AI } from '../config/openai.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { jobReporter } from '../services/processing.service.js';
import { getSettings } from '../services/settings.service.js';
import { transcriptProvider } from '../services/transcript.service.js';
import { downloadDocument, extractText, removeDocument } from '../services/document.service.js';
import { restructureConversation } from '../services/restructure.service.js';
import { chunkText, chunkPages, chunkSegments, normalizeText } from '../services/chunking.service.js';
import { embed } from '../services/openai.service.js';
import { listChannelVideos } from '../services/youtube.service.js';
import { enqueueJob } from '../services/processing.service.js';
import { recordAudit } from '../services/audit.service.js';
import { notifyAdmins } from '../services/notification.service.js';

const permanent = msg => { const e = ApiError.validation(msg); e.permanent = true; return e; };

async function saveContents(sourceId, content, segments, extra = {}) {
  await query(`insert into ${T.sourceContents} (source_id, content, segments, language, provider, updated_at) values ($1, $2, $3, $4, $5, now())
               on conflict (source_id) do update set content = excluded.content, segments = excluded.segments, language = excluded.language, provider = excluded.provider, updated_at = now()`,
  [sourceId, content, JSON.stringify(segments || []), extra.language || null, extra.provider || null]);
}

/** Discover a channel's latest public videos and queue one video source each. */
async function runChannelDiscovery(job, source, r) {
  await r.progress(10, 'Fetch content', 'Reading the channel video list.');
  const max = source.metadata?.maxVideos || env.CHANNEL_MAX_VIDEOS;
  const { channelName, videos } = await listChannelVideos(source.metadata.channelId, max);
  if (!videos.length) throw permanent('No public videos were found for this channel.');
  let created = 0, skipped = 0;
  for (const v of videos) {
    const exists = await one(`select id from ${T.sources} where source_type = 'youtube' and metadata ->> 'videoId' = $1`, [v.videoId]);
    if (exists) { skipped++; continue; }
    await tx(async db => {
      const s = (await db.query(
        `insert into ${T.sources} (title, source_type, source_url, channel_name, visibility, status, metadata, tags, owner_id, created_by)
         values ($1, 'youtube', $2, $3, $4, 'pending', $5, $6, $7, $7) returning id`,
        [v.title || `YouTube video ${v.videoId}`, `https://www.youtube.com/watch?v=${v.videoId}`, channelName || source.channel_name, source.visibility,
          JSON.stringify({ kind: 'video', videoId: v.videoId, thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`, channelSourceId: source.id, publishedAt: v.publishedAt }), source.tags, source.owner_id])).rows[0];
      if (source.visibility === 'restricted') await db.query(`insert into ${T.sourceAccess} (source_id, user_id) select $1, user_id from ${T.sourceAccess} where source_id = $2`, [s.id, source.id]);
      await enqueueJob(db, { sourceId: s.id, jobType: 'transcript_extraction', requestedBy: job.requested_by });
    });
    created++;
  }
  await query(`update ${T.sources} set channel_name = coalesce($2, channel_name), status = 'processing', metadata = metadata || $3 where id = $1`,
    [source.id, channelName || null, JSON.stringify({ discoveredAt: new Date().toISOString(), discovered: videos.length })]);
  await r.complete({ discovered: videos.length, created, skipped });
  await updateChannelStatus(source.id);
}

/** A channel is "indexed" only when every one of its video sources has finished (indexed or failed). */
export async function updateChannelStatus(channelSourceId) {
  if (!channelSourceId) return;
  const c = await one(`select count(*)::int as total, count(*) filter (where status = 'indexed')::int as indexed,
      count(*) filter (where status in ('pending','processing'))::int as open, count(*) filter (where status = 'failed')::int as failed
    from ${T.sources} where metadata ->> 'channelSourceId' = $1`, [channelSourceId]);
  if (!c.total || c.open > 0) return;
  const status = c.indexed > 0 ? 'indexed' : 'failed';
  const errorMessage = c.failed > 0 ? `${c.failed} of ${c.total} videos could not be indexed.` : null;
  await query(`update ${T.sources} set status = $2::text, indexed_at = case when $2::text = 'indexed' then now() else indexed_at end,
       error_message = $3, metadata = metadata || $4::jsonb where id = $1 and status <> 'disabled'`,
  [channelSourceId, status, errorMessage, JSON.stringify({ videosIndexed: c.indexed, videosFailed: c.failed })]);
}

export async function runJob(job) {
  const r = jobReporter(job);
  const source = await one(`select * from ${T.sources} where id = $1`, [job.source_id]);
  try {
    if (!source) throw permanent('The source was deleted.');
    if (source.status === 'disabled') throw permanent('The source is disabled.');
    await query(`update ${T.sources} set status = 'processing', error_message = null where id = $1`, [source.id]);
    r.log('info', `Worker picked up ${job.job_type} (attempt ${job.attempts}).`);

    if (job.job_type === 'channel_discovery') return await runChannelDiscovery(job, source, r);

    const { knowledge } = await getSettings();
    const chunkOpts = { chunkSize: knowledge.chunkSize, chunkOverlap: knowledge.chunkOverlap };
    let chunks; let durationSeconds = null; const metaPatch = {};

    if (source.source_type === 'youtube') {
      const videoId = source.metadata?.videoId;
      if (!videoId) throw permanent('The YouTube video ID is missing.');
      let t;
      if (source.metadata?.manualTranscript) {
        await r.progress(10, 'Fetch content', 'Using the transcript provided by an administrator.');
        const stored = await one(`select segments from ${T.sourceContents} where source_id = $1`, [source.id]);
        if (!stored?.segments?.length) throw permanent('The manual transcript is missing.');
        t = { segments: stored.segments, provider: 'manual', language: null };
      } else {
        // re-indexing a video reuses the transcript fetched earlier (no new YouTube request)
        const stored = source.indexed_at ? await one(`select segments, language, provider from ${T.sourceContents} where source_id = $1`, [source.id]) : null;
        if (stored?.segments?.length) {
          await r.progress(10, 'Fetch content', 'Re-using the stored transcript.');
          const last = stored.segments[stored.segments.length - 1];
          t = { segments: stored.segments, provider: stored.provider, language: stored.language, autoGenerated: !!source.metadata?.transcript?.autoGenerated };
          durationSeconds = source.duration_seconds || (last ? Math.ceil((last.start || 0) + (last.duration || 0)) : null);
        } else {
          await r.progress(10, 'Fetch content', `Fetching the public caption track (${transcriptProvider.name}).`);
          t = await transcriptProvider.getTranscript(videoId);
          durationSeconds = t.durationSeconds || null;
          await saveContents(source.id, t.segments.map(s => s.text).join('\n'), t.segments, t);
        }
      }
      metaPatch.transcript = { provider: t.provider, language: t.language || null, autoGenerated: !!t.autoGenerated, segments: t.segments.length };
      await r.progress(30, 'Normalize', `Transcript has ${t.segments.length} segments.`);
      chunks = chunkSegments(t.segments, chunkOpts);
      if (!durationSeconds && t.segments.length) { const l = t.segments[t.segments.length - 1]; durationSeconds = Math.ceil(l.start + (l.duration || 0)); }
    } else if (source.source_type === 'client_conversation') {
      // raw client conversations are anonymised and restructured into playbook entries before indexing
      let text;
      if (source.metadata?.restructured) {
        await r.progress(10, 'Fetch content', 'Re-using the restructured conversation.');
        text = (await one(`select content from ${T.sourceContents} where source_id = $1`, [source.id]))?.content;
        if (!text) throw permanent('The conversation content is missing. Upload it again.');
      } else {
        let raw;
        if (source.storage_path) {
          await r.progress(5, 'Fetch content', 'Reading the uploaded conversation file.');
          const ex = await extractText(await downloadDocument(source.storage_path), source.metadata?.file?.type || 'txt');
          raw = ex.text;
        } else {
          await r.progress(5, 'Fetch content', 'Reading the submitted conversation.');
          raw = (await one(`select content from ${T.sourceContents} where source_id = $1`, [source.id]))?.content;
        }
        if (!raw?.trim()) throw permanent('The conversation is empty.');
        if (raw.length > env.MAX_SOURCE_CHARACTERS) throw permanent(`The conversation is too long (more than ${env.MAX_SOURCE_CHARACTERS.toLocaleString()} characters).`);
        await r.progress(10, 'Normalize', 'Anonymising and restructuring the conversation with AI.');
        const out = await restructureConversation(normalizeText(raw), {
          title: source.title, category: source.metadata?.category,
          onProgress: (done, total) => r.progress(10 + Math.round((done / total) * 25), 'Normalize', `Restructured part ${done} of ${total}.`)
        });
        if (!out.entries) throw permanent('No reusable negotiation or client-handling content was found in this conversation.');
        text = out.text;
        // keep only the anonymised result: the raw log (and its uploaded file) is not retained
        await saveContents(source.id, text, [], { provider: 'restructured' });
        if (source.storage_path) {
          await removeDocument(source.storage_path);
          await query(`update ${T.sources} set storage_path = null where id = $1`, [source.id]);
        }
        metaPatch.restructured = { at: new Date().toISOString(), entries: out.entries, parts: out.parts, model: out.model };
        // recorded right away so a retry after a later failure re-uses the result instead of restructuring again
        await query(`update ${T.sources} set metadata = metadata || $2 where id = $1`, [source.id, JSON.stringify({ restructured: metaPatch.restructured })]);
        await r.progress(35, 'Normalize', `Created ${out.entries} anonymised playbook entries.`);
      }
      chunks = chunkText(text, chunkOpts);
    } else if (['pdf', 'docx'].includes(source.source_type) || (source.storage_path && ['txt', 'markdown'].includes(source.source_type))) {
      await r.progress(10, 'Fetch content', 'Reading the stored file.');
      const buf = await downloadDocument(source.storage_path);
      await r.progress(20, 'Extract text', 'Extracting text.');
      const ex = await extractText(buf, source.source_type);
      if (ex.text.length > env.MAX_SOURCE_CHARACTERS) throw permanent(`The document is too long (more than ${env.MAX_SOURCE_CHARACTERS.toLocaleString()} characters).`);
      await saveContents(source.id, ex.text, [], { provider: source.source_type });
      if (ex.pageCount) metaPatch.pageCount = ex.pageCount;
      await r.progress(30, 'Normalize', `Extracted ${ex.text.length.toLocaleString()} characters${ex.pageCount ? ` from ${ex.pageCount} pages` : ''}.`);
      chunks = ex.pages ? chunkPages(ex.pages, chunkOpts) : chunkText(ex.text, chunkOpts);
    } else {
      await r.progress(10, 'Fetch content', 'Reading the submitted text.');
      const stored = await one(`select content from ${T.sourceContents} where source_id = $1`, [source.id]);
      if (!stored?.content) throw permanent('The text content is missing.');
      const text = normalizeText(stored.content);
      await r.progress(30, 'Normalize', `Normalized ${text.length.toLocaleString()} characters.`);
      chunks = chunkText(text, chunkOpts);
    }

    if (!chunks.length) throw permanent('No text was found to index.');
    await r.progress(45, 'Generate chunks', `Created ${chunks.length} chunks.`);

    // the title is embedded with every chunk (not stored in it): video/document titles carry strong topical signal
    const { vectors, tokens } = await embed(chunks.map(c => `${source.title}\n\n${c.content}`), {
      onProgress: async (done, total) => r.progress(45 + Math.round((done / total) * 45), 'Create embeddings', `Embedded ${done}/${total} chunks.`)
    });

    await r.progress(92, 'Write to index', 'Replacing the index for this source.');
    await tx(async db => {
      await db.query(`delete from ${T.chunks} where source_id = $1`, [source.id]);
      for (let i = 0; i < chunks.length; i += 20) { // small batches: each row carries a 1536-dim vector
        const part = chunks.slice(i, i + 20); const params = []; const rows = [];
        part.forEach((c, k) => {
          const idx = i + k;
          params.push(source.id, idx, c.content, c.tokenCount ?? null, c.startSeconds ?? null, c.endSeconds ?? null, c.pageNumber ?? null, toVector(vectors[idx]));
          const b = params.length - 8;
          rows.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}::extensions.vector)`);
        });
        await db.query(`insert into ${T.chunks} (source_id, chunk_index, content, token_count, start_seconds, end_seconds, page_number, embedding) values ${rows.join(',')}`, params);
      }
      await db.query(`update ${T.sources} set status = 'indexed', chunk_count = $2, indexed_at = now(), error_message = null,
                        duration_seconds = coalesce($3, duration_seconds), metadata = metadata || $4 where id = $1`,
      [source.id, chunks.length, durationSeconds, JSON.stringify({ ...metaPatch, embeddingModel: AI.embeddingModel })]);
      await db.query(`insert into ${T.usage} (user_id, kind, model, input_tokens, source_id) values ($1, 'embedding_index', $2, $3, $4)`, [job.requested_by, AI.embeddingModel, tokens, source.id]);
    });
    await r.complete({ chunks: chunks.length, embeddingTokens: tokens });
    await recordAudit({ actor: { id: null, email: 'system' }, action: 'job.completed', entityType: 'job', entityId: job.id, entityLabel: job.job_type, details: { sourceId: source.id, chunks: chunks.length } });
    // one notification per new source; channel videos and re-indexes would otherwise flood the inbox
    if (!source.indexed_at && !source.metadata?.channelSourceId) await notifyAdmins({ type: 'source_indexed', title: 'Source indexed', message: `"${source.title}" is ready (${chunks.length} chunks).`, link: `/admin/knowledge/${source.id}`, metadata: { sourceId: source.id } });
    if (source.metadata?.channelSourceId) await updateChannelStatus(source.metadata.channelSourceId);
  } catch (err) {
    logger.warn({ jobId: job.id, sourceId: job.source_id, code: err?.code, transient: !!err?.transient }, 'job failed');
    const retrying = await r.fail(err);
    if (!retrying && source?.metadata?.channelSourceId) await updateChannelStatus(source.metadata.channelSourceId);
  }
}

/** Ids of chunks whose embeddings are missing (used by the reindex script). */
export const sourcesNeedingReindex = () => many(`select id, title from ${T.sources} where status = 'indexed' and coalesce(metadata ->> 'embeddingModel', '') <> $1`, [AI.embeddingModel]);
