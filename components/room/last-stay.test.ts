import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { markCheckedOut, readLastStay, rememberStay } from './last-stay';

function fakeStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
}

const STAY = { roomNumber: '204', venue: { id: 'v1', name: 'Bombay Rasoi', slug: 'bombay-rasoi' }, nights: 1, total: 4160, dining: 660, checkIn: '2026-10-21T10:00:00.000Z' };

describe('what the phone keeps of its stay', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', fakeStorage()); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-21T15:00:00.000Z')); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('remembers a live stay, then keeps the first moment it was seen to be over', () => {
    expect(readLastStay('ROOM_x')).toBeNull();
    rememberStay('ROOM_x', STAY);
    expect(readLastStay('ROOM_x')).toMatchObject({ ...STAY, checkedOutAt: null });

    const out = markCheckedOut('ROOM_x', new Date('2026-10-21T15:48:00.000Z'));
    expect(out?.checkedOutAt).toBe('2026-10-21T15:48:00.000Z');
    // Seen again later: the same moment, not a new one.
    expect(markCheckedOut('ROOM_x', new Date('2026-10-21T16:00:00.000Z'))?.checkedOutAt).toBe('2026-10-21T15:48:00.000Z');
    // The stay is live again (a new check-in confirmed on this phone): the farewell is forgotten.
    rememberStay('ROOM_x', STAY);
    expect(readLastStay('ROOM_x')?.checkedOutAt).toBeNull();
  });

  it('knows nothing about a room this phone was never confirmed in, and forgets a stay after a day and a half', () => {
    expect(markCheckedOut('ROOM_other')).toBeNull();
    rememberStay('ROOM_x', STAY);
    vi.setSystemTime(new Date('2026-10-23T04:00:00.000Z'));
    expect(readLastStay('ROOM_x')).toBeNull();
  });
});
