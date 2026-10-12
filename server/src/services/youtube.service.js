/**
 * YouTube URL handling and public metadata.
 *  - Video metadata: official oEmbed endpoint (title, channel).
 *  - Channel discovery: the public RSS feed (latest 15) or, for more videos or when YouTube has no feed for the
 *    channel, the channel's public Videos tab and its continuation pages (no API key needed).
 * No private/restricted content is accessed and no authentication is bypassed.
 */
import { ApiError } from '../utils/ApiError.js';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const UA = 'Mozilla/5.0 (compatible; DTSAI-KnowledgeIndexer/1.0)';

/** → { kind: 'video', videoId, url } | { kind: 'channel', channelId?, handle?, url } */
export function parseYouTubeUrl(input) {
  let u;
  try { u = new URL(String(input).trim()); } catch { throw ApiError.validation('Enter a valid YouTube URL.'); }
  const host = u.hostname.replace(/^www\.|^m\.|^music\./, '');
  if (!['youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host) || !/^https?:$/.test(u.protocol)) throw ApiError.validation('Only youtube.com and youtu.be URLs are supported.');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (u.pathname === '/watch') id = u.searchParams.get('v');
  else { const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/); if (m) id = m[1]; }
  if (id) {
    if (!VIDEO_ID.test(id)) throw ApiError.validation('The YouTube video ID in this URL is not valid.');
    return { kind: 'video', videoId: id, url: `https://www.youtube.com/watch?v=${id}` };
  }
  let m;
  if ((m = u.pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})/))) return { kind: 'channel', channelId: m[1], url: `https://www.youtube.com/channel/${m[1]}` };
  if ((m = u.pathname.match(/^\/@([A-Za-z0-9._-]{3,100})/))) return { kind: 'channel', handle: m[1], url: `https://www.youtube.com/@${m[1]}` };
  throw ApiError.validation('Unsupported YouTube URL. Use a video link (watch, youtu.be, shorts) or a channel link (/channel/UC… or /@handle).');
}

export const videoUrl = (videoId, seconds) => `https://www.youtube.com/watch?v=${videoId}${Number.isFinite(seconds) && seconds > 0 ? `&t=${Math.floor(seconds)}s` : ''}`;

async function get(url, ms = 12000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' }, signal: ctrl.signal, redirect: 'follow' }); }
  finally { clearTimeout(t); }
}

/** Public video metadata via oEmbed. Throws a permanent error for private/removed videos. */
export async function fetchVideoMetadata(videoId) {
  const r = await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(videoUrl(videoId))}`);
  if (r.status === 401 || r.status === 403 || r.status === 404) {
    const e = ApiError.validation('This video is private, removed or cannot be embedded, so it cannot be indexed.'); e.permanent = true; throw e;
  }
  if (!r.ok) { const e = ApiError.unavailable('YouTube metadata is temporarily unavailable.'); e.transient = true; throw e; }
  const j = await r.json();
  return { title: String(j.title || '').slice(0, 300), channelName: String(j.author_name || '').slice(0, 200), channelUrl: j.author_url || null, thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
}

/** Resolve an @handle to its channel id from the public channel page. */
export async function resolveChannelId(parsed) {
  if (parsed.channelId) return parsed.channelId;
  const r = await get(`https://www.youtube.com/@${encodeURIComponent(parsed.handle)}`);
  if (!r.ok) { const e = ApiError.validation('This YouTube channel could not be found.'); e.permanent = r.status === 404; throw e; }
  const html = await r.text();
  const m = html.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/) || html.match(/<meta itemprop="identifier" content="(UC[A-Za-z0-9_-]{22})"/) || html.match(/"channelId":"(UC[A-Za-z0-9_-]{22})"/);
  if (!m || !CHANNEL_ID.test(m[1])) { const e = ApiError.validation('The channel ID could not be determined for this handle.'); e.permanent = true; throw e; }
  return m[1];
}

const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const dedupe = (list, max) => { const seen = new Set(); return list.filter(v => v.videoId && (seen.has(v.videoId) ? false : seen.add(v.videoId))).slice(0, max); };

/** Latest public videos via the channel RSS feed (YouTube returns at most 15). Returns null when the feed is unavailable. */
async function channelFeed(channelId) {
  const r = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`).catch(() => null);
  if (!r?.ok) return null;
  const xml = await r.text();
  const channelName = decode((xml.match(/<author>\s*<name>([^<]+)<\/name>/) || [])[1] || '');
  const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => ({
    videoId: (m[1].match(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/) || [])[1],
    title: decode((m[1].match(/<title>([^<]*)<\/title>/) || [])[1] || ''),
    publishedAt: (m[1].match(/<published>([^<]+)<\/published>/) || [])[1] || null
  }));
  return { channelName, videos };
}

/** Collect video entries (title + id) and the next-page token from a YouTube browse payload. */
export function collectGridItems(node) {
  const videos = []; let continuation = null;
  const walk = o => {
    if (!o || typeof o !== 'object') return;
    if (o.videoRenderer?.videoId) { videos.push({ videoId: o.videoRenderer.videoId, title: o.videoRenderer.title?.runs?.map(r => r.text).join('') || '', publishedAt: null }); return; }
    if (o.lockupViewModel?.contentId && /VIDEO/.test(o.lockupViewModel.contentType || 'VIDEO')) {
      videos.push({ videoId: o.lockupViewModel.contentId, title: o.lockupViewModel.metadata?.lockupMetadataViewModel?.title?.content || '', publishedAt: null }); return;
    }
    if (o.continuationItemRenderer) { continuation = o.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token || continuation; return; }
    for (const k in o) walk(o[k]);
  };
  walk(node);
  return { videos: videos.filter(v => VIDEO_ID.test(v.videoId)), continuation };
}

const WEB_CLIENT = { clientName: 'WEB', clientVersion: '2.20250101.00.00', hl: 'en', gl: 'US' };
const BROWSER_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'CONSENT=YES+1' };

/** Public "Videos" tab of a channel (first page + continuation pages), used when the RSS feed is unavailable or for more than 15 videos. */
async function channelVideosTab(channelId, max) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
  let html;
  try {
    const r = await fetch(`https://www.youtube.com/channel/${channelId}/videos?hl=en`, { headers: BROWSER_HEADERS, signal: ctrl.signal });
    if (r.status === 404) { const e = ApiError.validation('This YouTube channel could not be found.'); e.permanent = true; throw e; }
    if (!r.ok) { const e = ApiError.unavailable('The channel page is temporarily unavailable.'); e.transient = true; throw e; }
    html = await r.text();
  } finally { clearTimeout(t); }
  const m = html.match(/var ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s);
  if (!m) { const e = ApiError.unavailable('The channel video list could not be read.'); e.transient = true; throw e; }
  let data;
  try { data = JSON.parse(m[1]); } catch { const e = ApiError.unavailable('The channel video list could not be read.'); e.transient = true; throw e; }
  const channelName = data.metadata?.channelMetadataRenderer?.title || '';
  // only the selected tab (Videos) — avoids picking up shelves from other tabs
  const tab = (data.contents?.twoColumnBrowseResultsRenderer?.tabs || []).find(x => x.tabRenderer?.selected)?.tabRenderer?.content || data;
  let { videos, continuation } = collectGridItems(tab);
  for (let page = 0; continuation && videos.length < max && page < 20; page++) {
    const r = await fetch('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', {
      method: 'POST', headers: { ...BROWSER_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: { client: WEB_CLIENT }, continuation })
    }).catch(() => null);
    if (!r?.ok) break;
    const next = collectGridItems(await r.json().catch(() => ({})));
    if (!next.videos.length) break;
    videos = videos.concat(next.videos); continuation = next.continuation;
  }
  return { channelName, videos };
}

/**
 * Public videos of a channel, newest first. The RSS feed is used when it can satisfy the request (≤ 15 videos);
 * otherwise — or when YouTube returns no feed for the channel — the public Videos tab is read.
 */
export async function listChannelVideos(channelId, max = 15) {
  const feed = max <= 15 ? await channelFeed(channelId) : null;
  if (feed?.videos.length) return { channelName: feed.channelName, videos: dedupe(feed.videos, max) };
  const tab = await channelVideosTab(channelId, max);
  if (!tab.videos.length && !feed) { const e = ApiError.unavailable('No public videos were found for this channel.'); e.permanent = true; throw e; }
  return { channelName: tab.channelName || feed?.channelName || '', videos: dedupe(tab.videos, max) };
}
