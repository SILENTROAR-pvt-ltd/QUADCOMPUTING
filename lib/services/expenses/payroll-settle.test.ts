import { describe, it, expect } from 'vitest';
import { buildPayroll, isOwed } from './payroll.util';

const staff = (over: Record<string, unknown>) => ({ id: 's1', name: 'Asha', base_salary: 30000, join_date: '2026-01-01', end_date: null, status: 'ACTIVE', ...over });

describe('who there is something to settle for', () => {
  it('an employee who has left is settled for the days they worked', () => {
    const { rows } = buildPayroll([staff({ status: 'LEFT', end_date: '2026-10-10' })], [], [], '2026-10');
    expect(rows[0]).toMatchObject({ status: 'LEFT', payable: 9677.42, pay_status: 'due' });
    expect(isOwed(rows[0])).toBe(true);
  });

  it('a joiner part-way through the month is owed for the days since they joined', () => {
    const { rows } = buildPayroll([staff({ join_date: '2026-10-21' })], [], [], '2026-10');
    expect(rows[0].prorated_days).toBe(11);
    expect(isOwed(rows[0])).toBe(true);
  });

  it('nothing is left to settle once it is paid, and an advance counts as already given', () => {
    const paid = buildPayroll([staff({ status: 'LEFT', end_date: '2026-10-10' })], [], [{ staff_id: 's1', amount: 9677.42 }], '2026-10').rows[0];
    expect(isOwed(paid)).toBe(false);
    const advanced = buildPayroll([staff({})], [{ staff_id: 's1', amount: 30000 }], [], '2026-10').rows[0];
    expect(isOwed(advanced)).toBe(false);
  });
});
