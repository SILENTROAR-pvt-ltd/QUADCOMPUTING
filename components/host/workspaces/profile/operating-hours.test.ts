import { describe, it, expect } from 'vitest';
import { ALL_DAY, isAllDay, isOpen247, type DayHours } from './useOperatingHours';

const day = (weekday: number, extra: Partial<DayHours> = {}): DayHours => ({ weekday, openTime: '10:00', closeTime: '22:00', isClosed: false, ...extra });

describe('open 24/7', () => {
  it('is on only when every day is open from midnight to the last minute', () => {
    const week = [0, 1, 2, 3, 4, 5, 6].map((d) => day(d, ALL_DAY));
    expect(isOpen247(week)).toBe(true);
    expect(isOpen247(week.map((d) => (d.weekday === 2 ? { ...d, isClosed: true } : d)))).toBe(false);
    expect(isOpen247(week.map((d) => (d.weekday === 5 ? { ...d, closeTime: '22:00' } : d)))).toBe(false);
    expect(isOpen247(null)).toBe(false);
    expect(isAllDay(day(1, ALL_DAY))).toBe(true);
    expect(isAllDay(day(1, { ...ALL_DAY, isClosed: true }))).toBe(false);
  });
});
