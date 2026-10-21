/**
 * A screen that loads on demand fails like this when the page was opened before a new version was deployed (its file name
 * no longer exists) or the connection dropped while it loaded. Retrying in place cannot work: the failed load is remembered.
 * Only a full reload fetches the new files.
 */
// Webpack ("Loading chunk … failed"), Turbopack ("Failed to load chunk …") and the browsers' own module-load errors.
const CHUNK_ERROR = /ChunkLoadError|Loading chunk [\w./-]+ failed|Failed to load chunk|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const e = error as { name?: unknown; message?: unknown };
  return CHUNK_ERROR.test(`${typeof e.name === 'string' ? e.name : ''} ${typeof e.message === 'string' ? e.message : String(error)}`);
}

const RELOAD_KEY = 'qc_chunk_reload_at';
const RELOAD_WINDOW_MS = 60_000;

/**
 * Reloads the page once for a stale-chunk error. A second one within a minute is not reloaded again, so a genuinely broken
 * deploy shows the message instead of looping. Returns whether a reload was started.
 */
export function reloadOnceForChunkError(now: number = Date.now()): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0);
    if (last && now - last < RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    // Storage blocked: reload would be unguarded and could loop, so do not.
    return false;
  }
  window.location.reload();
  return true;
}
