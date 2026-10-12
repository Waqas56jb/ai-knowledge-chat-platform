/**
 * After a new deployment the previous build's files are gone, so a tab opened before the deploy can fail to
 * load a lazy page ("Failed to fetch dynamically imported module"). Reload once to pick up the new build;
 * the timestamp guard prevents a reload loop if the error has another cause.
 */
const KEY = 'nexus-client-chunk-reload';
export const isChunkError = err => /dynamically imported module|Importing a module script failed|error loading dynamically imported|ChunkLoadError|Unable to preload CSS/i.test(String(err?.message || err || ''));

export function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 15000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* storage unavailable: still reload once */ }
  window.location.reload();
  return true;
}

export function installChunkReload() {
  window.addEventListener('vite:preloadError', e => { if (reloadOnce()) e.preventDefault(); });
}
