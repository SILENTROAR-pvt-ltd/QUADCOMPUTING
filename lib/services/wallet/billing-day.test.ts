import { describe, expect, it } from 'vitest';
import { billingDayBounds, billingDayOf, billingRangeBounds, daysBetween, inOperatingWindow, shiftDay } from './billing-day';

// IST is UTC+05:30: 16:29 UTC is 21:59 IST, 16:30 UTC is 22:00 IST.
describe('billingDayOf', () => {
  it('keeps a bill on its own day up to 9:59 PM IST', () => {
    expect(billingDayOf('2026-10-16T16:29:00Z')).toBe('2026-10-16');
  });

  it('rolls a bill at or after 10 PM IST into the next day', () => {
    expect(billingDayOf('2026-10-16T16:30:00Z')).toBe('2026-10-17');
    expect(billingDayOf('2026-10-16T18:00:00Z')).toBe('2026-10-17');
  });

  it('puts an early-morning bill on that same day', () => {
    // 01:00 IST on 17 Oct.
    expect(billingDayOf('2026-10-16T19:30:00Z')).toBe('2026-10-17');
  });

  it('rolls over month and year ends', () => {
    expect(billingDayOf('2026-12-31T17:00:00Z')).toBe('2027-01-01');
  });
});

describe('inOperatingWindow', () => {
  it('is true from 10 AM up to 10 PM IST only', () => {
    expect(inOperatingWindow('2026-10-16T04:29:00Z')).toBe(false); // 09:59 IST
    expect(inOperatingWindow('2026-10-16T04:30:00Z')).toBe(true); // 10:00 IST
    expect(inOperatingWindow('2026-10-16T16:29:00Z')).toBe(true); // 21:59 IST
    expect(inOperatingWindow('2026-10-16T16:30:00Z')).toBe(false); // 22:00 IST
  });
});

describe('billingDayBounds', () => {
  it('runs from the previous day 10 PM to this day 10 PM IST', () => {
    const { start, end } = billingDayBounds('2026-10-16');
    expect(start.toISOString()).toBe('2026-10-15T16:30:00.000Z');
    expect(end.toISOString()).toBe('2026-10-16T16:30:00.000Z');
  });

  it('agrees with billingDayOf at both edges', () => {
    const { start, end } = billingDayBounds('2026-10-16');
    expect(billingDayOf(start)).toBe('2026-10-16');
    expect(billingDayOf(end.getTime() - 1)).toBe('2026-10-16');
    expect(billingDayOf(end)).toBe('2026-10-17');
  });

  it('spans a range of days end to end', () => {
    const { start, end } = billingRangeBounds('2026-10-10', '2026-10-16');
    expect(start.toISOString()).toBe('2026-10-09T16:30:00.000Z');
    expect(end.toISOString()).toBe('2026-10-16T16:30:00.000Z');
  });
});

describe('day arithmetic', () => {
  it('shifts and counts whole days', () => {
    expect(shiftDay('2026-10-01', -1)).toBe('2026-09-30');
    expect(daysBetween('2026-10-10', '2026-10-16')).toBe(7);
    expect(daysBetween('2026-10-16', '2026-10-16')).toBe(1);
  });
});
