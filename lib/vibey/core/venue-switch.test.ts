import { afterEach, describe, expect, it } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { readVibeySwitches, writeVibeySwitches } from './venue-switch';

const A = 'aaaaaaaa-1111-4222-8333-444444444444';
const B = 'bbbbbbbb-1111-4222-8333-444444444444';
const venues = () => createFakeSupabase({
  businesses: [
    { id: A, vibey_guest_enabled: false, vibey_host_enabled: false },
    { id: B, vibey_guest_enabled: true, vibey_host_enabled: true },
  ],
});

describe('the owner’s Vibey switches', () => {
  afterEach(() => { delete process.env.VIBEY_PILOT_VENUES; delete process.env.VIBEY_ENABLED; });

  it('reads the venue’s own switches', async () => {
    expect(await readVibeySwitches(venues(), A)).toMatchObject({ guest: false, host: false, pilot: false, available: true });
    expect(await readVibeySwitches(venues(), B)).toMatchObject({ guest: true, host: true });
  });

  it('switches one surface on without touching the other, or any other venue', async () => {
    const db = venues();
    expect(await writeVibeySwitches(db, A, { guest: true })).toEqual({ ok: true });
    expect(await readVibeySwitches(db, A)).toMatchObject({ guest: true, host: false });
    await writeVibeySwitches(db, A, { host: true });
    await writeVibeySwitches(db, A, { guest: false });
    expect(await readVibeySwitches(db, A)).toMatchObject({ guest: false, host: true });
    expect(await readVibeySwitches(db, B)).toMatchObject({ guest: true, host: true });
  });

  it('refuses an empty change and explains a database without the columns', async () => {
    expect(await writeVibeySwitches(venues(), A, {})).toMatchObject({ ok: false, code: 'FAILED' });
    const old = createFakeSupabase({ businesses: [{ id: A }] }, {
      failOn: { 'businesses.update': () => true },
    });
    expect((await writeVibeySwitches(old, A, { guest: true })).ok).toBe(false);
  });

  it('says when the venue is piloted or Vibey is paused everywhere', async () => {
    process.env.VIBEY_PILOT_VENUES = A;
    expect(await readVibeySwitches(venues(), A)).toMatchObject({ guest: false, pilot: true });
    process.env.VIBEY_ENABLED = '0';
    expect(await readVibeySwitches(venues(), A)).toMatchObject({ available: false });
  });
});
