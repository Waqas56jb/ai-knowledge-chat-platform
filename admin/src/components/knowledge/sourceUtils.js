import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '../common/ConfirmDialog';
import { startProcessing, retrySource, enableSource, disableSource, deleteSource, getSourceDownload } from '../../services/knowledgeService';
import { isActiveJob } from '../../services/processingService';

export { isActiveJob };
export { VISIBILITY_SHORT } from '../../constants/domain';

/**
 * Parse a YouTube video or channel URL (client-side check before sending it to the server).
 * Returns { kind: 'video', videoId } | { kind: 'channel', handle } | null.
 */
export function parseYouTubeUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  let u;
  try { u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); } catch (e) { return null; }
  const host = u.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, '');
  const parts = u.pathname.split('/').filter(Boolean);
  const isId = id => /^[\w-]{11}$/.test(id || '');
  if (host === 'youtu.be') return isId(parts[0]) ? { kind: 'video', videoId: parts[0] } : null;
  if (host !== 'youtube.com') return null;
  if (parts[0] === 'watch') { const v = u.searchParams.get('v'); return isId(v) ? { kind: 'video', videoId: v } : null; }
  if (parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'embed') return isId(parts[1]) ? { kind: 'video', videoId: parts[1] } : null;
  if (parts[0] && /^@[\w.-]{2,}$/.test(parts[0])) return { kind: 'channel', handle: parts[0] };
  if (parts[0] === 'channel' && /^UC[\w-]{10,}$/.test(parts[1] || '')) return { kind: 'channel', handle: parts[1] };
  if ((parts[0] === 'c' || parts[0] === 'user') && parts[1]) return { kind: 'channel', handle: parts[1] };
  return null;
}

export const ytThumbnail = videoId => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

/** File extension → knowledge source type (server accepts PDF, DOCX, TXT and MD). */
export const FILE_TYPES = { pdf: 'pdf', docx: 'docx', txt: 'txt', md: 'markdown', markdown: 'markdown' };
export const fileExt = name => (String(name).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || '';

const DOCUMENT_TYPES = ['pdf', 'docx', 'txt', 'markdown'];

/**
 * Which row/header actions make sense for a source right now.
 * `activeJob` is the queued/processing job for the source, if known.
 */
export function sourceCapabilities(source, activeJob) {
  const busy = isActiveJob(activeJob) || source.status === 'processing';
  return {
    start: source.status === 'pending' && !busy,
    reindex: source.status === 'indexed' && !busy,
    retry: source.status === 'failed' && !busy,
    disable: source.status !== 'disabled' && !busy,
    enable: source.status === 'disabled',
    download: !!source.file && DOCUMENT_TYPES.includes(source.type),
    busy
  };
}

/** Mutation handlers for a source with confirmations and toasts. `pending` holds the running action key. */
export function useSourceActions({ onDeleted } = {}) {
  const confirm = useConfirm();
  const [pending, setPending] = useState(null);

  const run = useCallback(async (key, fn, success) => {
    setPending(key);
    try { const r = await fn(); if (success) toast.success(success.title, success.description ? { description: success.description } : undefined); return r ?? true; }
    catch (err) { toast.error(err.message); return null; }
    finally { setPending(null); }
  }, []);

  const start = useCallback(async (s, reindex = false) => {
    if (reindex && !(await confirm({ title: 'Re-index source?', message: `"${s.title}" will be processed again from its stored content. Answers keep using the current chunks until the new run finishes.`, confirmLabel: 'Re-index' }))) return null;
    return run(`start:${s.id}`, () => startProcessing(s.id),
      { title: reindex ? 'Re-index queued.' : 'Processing started.', description: `"${s.title}" was queued for processing.` });
  }, [confirm, run]);

  const retry = useCallback(s => run(`retry:${s.id}`, () => retrySource(s.id),
    { title: 'Retry queued.', description: `A new processing job for "${s.title}" was queued.` }), [run]);

  const enable = useCallback(s => run(`enable:${s.id}`, () => enableSource(s.id), { title: 'Source re-enabled.' }), [run]);

  const disable = useCallback(async s => {
    const ok = await confirm({ title: 'Disable source?', message: `"${s.title}" will no longer be used for answers until it is re-enabled. Its chunks are kept.`, confirmLabel: 'Disable source', danger: true });
    if (!ok) return null;
    return run(`disable:${s.id}`, () => disableSource(s.id), { title: 'Source disabled.' });
  }, [confirm, run]);

  const remove = useCallback(async s => {
    const ok = await confirm({ title: 'Delete source?', message: `"${s.title}", its stored file, chunks and processing jobs will be permanently deleted. Answers will no longer cite it. This cannot be undone.`, confirmLabel: 'Delete source', danger: true });
    if (!ok) return null;
    const r = await run(`delete:${s.id}`, () => deleteSource(s.id), { title: 'Source deleted.' });
    if (r && onDeleted) onDeleted(s);
    return r;
  }, [confirm, run, onDeleted]);

  /** Opens a short-lived signed URL for the original document. */
  const download = useCallback(async s => {
    setPending(`download:${s.id}`);
    // open the tab synchronously so pop-up blockers allow it, then point it at the signed URL
    const win = window.open('', '_blank');
    try {
      const { url } = await getSourceDownload(s.id);
      if (win) { win.opener = null; win.location.href = url; } else window.location.assign(url);
    } catch (err) {
      if (win) win.close();
      toast.error(err.message);
    } finally { setPending(null); }
  }, []);

  return { start, retry, enable, disable, remove, download, pending };
}
