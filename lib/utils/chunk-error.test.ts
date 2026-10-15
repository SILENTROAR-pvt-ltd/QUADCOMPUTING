import { describe, it, expect, vi, afterEach } from 'vitest';
import { isChunkLoadError, reloadOnceForChunkError } from './chunk-error';

describe('isChunkLoadError', () => {
  it('recognises the stale-page and dropped-connection load failures', () => {
    const named = new Error('Loading chunk 4511 failed.\n(error: http://localhost:3000/_next/static/chunks/4511.js)');
    named.name = 'ChunkLoadError';
    expect(isChunkLoadError(named)).toBe(true);
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: http://x/_next/static/chunks/a.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
  });

  it('leaves real bugs alone', () => {
    expect(isChunkLoadError(new Error('Rendered more hooks than during the previous render.'))).toBe(false);
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('reloadOnceForChunkError', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  function fakeWindow(initial: string | null) {
    const store = new Map<string, string>(initial ? [['qc_chunk_reload_at', initial]] : []);
    const reload = vi.fn();
    vi.stubGlobal('window', {
      sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
      location: { reload },
    });
    return reload;
  }

  it('reloads the first time', () => {
    const reload = fakeWindow(null);
    expect(reloadOnceForChunkError(1_000_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload again within a minute, so a broken deploy cannot loop', () => {
    const reload = fakeWindow('1000000');
    expect(reloadOnceForChunkError(1_030_000)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads again after the minute has passed', () => {
    const reload = fakeWindow('1000000');
    expect(reloadOnceForChunkError(1_061_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
