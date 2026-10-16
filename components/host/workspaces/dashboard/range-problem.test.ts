import { describe, expect, it } from 'vitest';
import { rangeProblem } from './DashboardCustomRangePicker';

describe('custom range check', () => {
  const today = '2026-10-16';
  it('accepts a valid range, including a single day and a full year', () => {
    expect(rangeProblem('2026-10-01', '2026-10-16', today)).toBeNull();
    expect(rangeProblem('2026-10-16', '2026-10-16', today)).toBeNull();
    expect(rangeProblem('2025-10-16', '2026-10-16', today)).toBeNull();
  });
  it('refuses missing dates, a backwards range, the future and more than a year', () => {
    expect(rangeProblem('', '2026-10-16', today)).toMatch(/both dates/);
    expect(rangeProblem('2026-10-10', '2026-10-01', today)).toMatch(/on or before/);
    expect(rangeProblem('2026-10-01', '2026-10-17', today)).toMatch(/future/);
    expect(rangeProblem('2025-10-15', '2026-10-16', today)).toMatch(/year or less/);
  });
});
