import { describe, it, expect } from 'vitest';
import { businessDateString, businessDayRange, businessHour, isDateOnly } from './business-day';
import { resolveAnalyticsDateRange } from '@/lib/services/analytics/date-range.util';

describe('IST business day', () => {
  it('maps instants to the IST calendar date', () => {
    expect(businessDateString(new Date('2026-10-05T18:29:59.999Z'))).toBe('2026-10-05');
    expect(businessDateString(new Date('2026-10-05T18:30:00.000Z'))).toBe('2026-10-06');
  });

  it('day range is 00:00:00.000 to 23:59:59.999 IST', () => {
    const { start, end } = businessDayRange('2026-10-06');
    expect(start.toISOString()).toBe('2026-10-05T18:30:00.000Z');
    expect(end.toISOString()).toBe('2026-10-06T18:29:59.999Z');
  });

  it('hour of day is IST', () => {
    expect(businessHour(new Date('2026-10-06T18:30:00.000Z'))).toBe(0);
    expect(businessHour(new Date('2026-10-06T06:00:00.000Z'))).toBe(11);
  });

  it('validates date-only strings', () => {
    expect(isDateOnly('2026-10-06')).toBe(true);
    expect(isDateOnly('2026-13-40')).toBe(false);
    expect(isDateOnly('06/10/2026')).toBe(false);
    expect(isDateOnly(undefined)).toBe(false);
  });
});

describe('analytics default ranges', () => {
  it('custom range is interpreted in IST', () => {
    const r = resolveAnalyticsDateRange('http://x/api?range=custom&startDate=2026-10-01&endDate=2026-10-03');
    expect(r.startDate).toBe('2026-09-30T18:30:00.000Z');
    expect(r.endDate).toBe('2026-10-03T18:29:59.999Z');
  });

  it('ignores a malformed custom range instead of building an Invalid Date', () => {
    const r = resolveAnalyticsDateRange('http://x/api?range=custom&startDate=oops&endDate=2026-10-03');
    expect(Number.isNaN(Date.parse(r.startDate))).toBe(false);
    expect(Number.isNaN(Date.parse(r.endDate))).toBe(false);
  });

  it('weekly spans 7 IST days ending today', () => {
    const r = resolveAnalyticsDateRange('http://x/api?range=weekly');
    const span = Date.parse(r.endDate) - Date.parse(r.startDate) + 1;
    expect(span).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
