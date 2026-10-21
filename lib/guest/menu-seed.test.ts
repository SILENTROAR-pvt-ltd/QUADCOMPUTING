import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { menuApiUrl, prefetchMenu, readMenuSeed, readRoomMenuSeed, writeRoomMenuSeed } from './menu-seed';

// A sessionStorage for the test: the real one belongs to a browser window.
function fakeStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
}

describe('menu seed', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', fakeStorage());
    vi.stubGlobal('window', {});
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('keeps a menu read ahead of time for a few minutes, then forgets it', async () => {
    vi.useFakeTimers();
    const url = menuApiUrl('venue-1', 'RS-101');
    expect(url).toBe('/api/guest/menu?table=RS-101&cafe_id=venue-1');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, items: [{ id: 'd1' }], business: { id: 'venue-1', name: 'Bombay Rasoi' } }) });
    vi.stubGlobal('fetch', fetchMock);

    await prefetchMenu(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(readMenuSeed(url)).toMatchObject({ items: [{ id: 'd1' }] });
    // Already held: no second read.
    await prefetchMenu(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(4 * 60_000);
    expect(readMenuSeed(url)).toBeNull();
  });

  it('never keeps a failed read, and the room seed round-trips', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'nope' }) }));
    await prefetchMenu('/api/guest/menu?table=T-1&cafe_id=v');
    expect(readMenuSeed('/api/guest/menu?table=T-1&cafe_id=v')).toBeNull();

    const seed = { roomNumber: '101', venueName: 'Bombay Rasoi', dining: { enabled: true, open: true, message: 'Kitchen open until 10 pm' } };
    writeRoomMenuSeed('ROOM_x', seed);
    expect(readRoomMenuSeed('ROOM_x')).toEqual(seed);
    expect(readRoomMenuSeed('ROOM_other')).toBeNull();
  });
});
