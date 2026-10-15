import { describe, it, expect } from 'vitest';
import { postcardTilt, postmarkDate, postmarkName } from './postcard-look';

describe('postcard look', () => {
  it('tilts each card a little, the same way every time', () => {
    for (const id of ['a', 'b-2', '7f1c2e3a-0000-4000-8000-123456789abc', 'zz']) {
      const t = postcardTilt(id);
      expect(t).toBe(postcardTilt(id));
      expect(Math.abs(t)).toBeLessThanOrEqual(1.4);
    }
    expect(new Set(['a', 'b', 'c', 'd', 'e', 'f'].map(postcardTilt)).size).toBeGreaterThan(2);
  });

  it('prints the day the way a postmark does, in Indian time', () => {
    expect(postmarkDate('2026-10-15T08:30:00.000Z')).toBe('15 OCT');
    // 19:00 UTC on the 14th is 00:30 IST on the 15th.
    expect(postmarkDate('2026-10-14T19:00:00.000Z')).toBe('15 OCT');
    expect(postmarkDate('not a date')).toBe('');
  });

  it('fits a venue name round the postmark', () => {
    expect(postmarkName('Bombay Rasoi')).toBe('BOMBAY RASOI');
    expect(postmarkName('The Very Long Named Mountain Cafe & Stay')).toBe('THE VERY LONG N…');
    expect(postmarkName('')).toBe('VIBERS');
  });
});
