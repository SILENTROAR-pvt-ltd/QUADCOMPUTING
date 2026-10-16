import { describe, expect, it } from 'vitest';
import { legacyStart, legacyToEvent } from './legacy-import';

// Friday 16 Oct 2026, 12:30 PM in India (07:00 UTC).
const NOW = Date.UTC(2026, 9, 16, 7, 0);
const ist = (iso: string) => new Date(Date.parse(iso) - 5.5 * 3600_000).toISOString();

describe('reading an old moment\'s time text', () => {
  it('"Tonight @ 8:30 PM" is this evening, and tomorrow\'s once tonight has gone', () => {
    expect(legacyStart('Tonight @ 8:30 PM', NOW).toISOString()).toBe(ist('2026-10-16T20:30:00Z'));
    const lateNight = Date.UTC(2026, 9, 16, 19, 0); // 12:30 AM on the 17th in India
    expect(legacyStart('Tonight @ 8:30 PM', lateNight).toISOString()).toBe(ist('2026-10-17T20:30:00Z'));
  });

  it('reads a weekday, tomorrow, an explicit date, and a time with no am or pm', () => {
    expect(legacyStart('Saturday @ 9pm', NOW).toISOString()).toBe(ist('2026-10-17T21:00:00Z'));
    expect(legacyStart('Tomorrow @ 7:15 PM', NOW).toISOString()).toBe(ist('2026-10-17T19:15:00Z'));
    expect(legacyStart('25 Oct @ 7 PM', NOW).toISOString()).toBe(ist('2026-10-25T19:00:00Z'));
    expect(legacyStart('Friday @ 8', NOW).toISOString()).toBe(ist('2026-10-16T20:00:00Z'));
  });

  it('falls back to this evening for text it cannot read', () => {
    expect(legacyStart('', NOW).toISOString()).toBe(ist('2026-10-16T20:00:00Z'));
    expect(legacyStart('soon!', NOW).toISOString()).toBe(ist('2026-10-16T20:00:00Z'));
  });
});

describe('a moment becomes an event', () => {
  it('keeps the title, picture and words, and starts out live and free', () => {
    const e = legacyToEvent({ id: '1', title: '  Movie   Night ', category: 'SNOW SPECIAL', time_tag: 'Tonight @ 8:30 PM', image_url: 'https://x.test/a.jpg', description: 'Welcome snacks' }, NOW);
    expect(e).toMatchObject({ title: 'Movie Night', category: 'SNOW SPECIAL', banner_url: 'https://x.test/a.jpg', description: 'Welcome snacks', status: 'LIVE', entry_fee: 0 });
  });

  it('drops a picture that is not a web address', () => {
    expect(legacyToEvent({ id: '1', title: 'x y', category: null, time_tag: null, image_url: 'javascript:1', description: null }, NOW).banner_url).toBeNull();
  });
});
