import { describe, it, expect } from 'vitest';
import { buildPayroll, salaryFor } from '@/lib/services/expenses/payroll.util';
import { parseMoney, parseStaff, paymentPeriod } from '@/lib/services/expenses/staff-input';
import { billSummary, parseBill, recurringDue } from '@/lib/services/expenses/bills.util';
import { periodRange, shiftPeriod } from '@/lib/services/expenses/period.util';

const STAFF = '0b0f2f1e-2d3c-4b5a-8c7d-9e0f1a2b3c4d';

describe('Payroll month', () => {
  it('pays a full month, and pro-rates a joiner or leaver by days employed', () => {
    expect(salaryFor(31000, '2025-01-10', null, '2026-10')).toEqual({ payable: 31000, days: null });
    expect(salaryFor(31000, '2026-10-17', null, '2026-10')).toEqual({ payable: 15000, days: 15 });
    expect(salaryFor(30000, '2025-01-01', '2026-09-10', '2026-09')).toEqual({ payable: 10000, days: 10 });
    expect(salaryFor(30000, '2026-11-01', null, '2026-10')).toEqual({ payable: 0, days: 0 });
  });

  it('takes advances and salary paid off what is owed, and totals the month', () => {
    const staff = [
      { id: 'a', name: 'Asha', join_date: '2025-01-01', base_salary: 20000, status: 'ACTIVE' },
      { id: 'b', name: 'Ravi', join_date: '2025-01-01', base_salary: 15000, status: 'ACTIVE' },
      { id: 'c', name: 'Left long ago', join_date: '2024-01-01', end_date: '2025-03-31', base_salary: 9000, status: 'INACTIVE' },
    ];
    const p = buildPayroll(staff, [{ staff_id: 'a', amount: 5000 }], [{ staff_id: 'a', amount: 15000 }, { staff_id: 'b', amount: 4000 }], '2026-10');
    expect(p.rows.map((r) => [r.name, r.balance, r.pay_status])).toEqual([['Asha', 0, 'paid'], ['Ravi', 11000, 'partly']]);
    expect(p.totals).toEqual({ headcount: 2, payable: 35000, advances: 5000, paid: 19000, outstanding: 11000 });
  });

  it('works out month boundaries and steps between months', () => {
    expect(periodRange('2028-02')).toEqual({ first: '2028-02-01', last: '2028-02-29', days: 29 });
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12');
  });
});

describe('Staff, advance and payment input', () => {
  it('needs a name, a salary of 0 or more and a joining date', () => {
    expect(parseStaff({ name: 'Asha', base_salary: '18000', join_date: '2026-10-01', role: 'waiter', contact_number: '98765 43210' }))
      .toMatchObject({ ok: true, value: { role: 'WAITER', base_salary: 18000, contact_number: '9876543210' } });
    expect(parseStaff({ name: 'Asha', base_salary: -1, join_date: '2026-10-01' })).toMatchObject({ ok: false });
    expect(parseStaff({ name: 'Asha', base_salary: 1, join_date: '2026-10-01', contact_number: '123' })).toMatchObject({ ok: false });
  });

  it('refuses zero amounts and future dates, and files a payment in its month', () => {
    expect(parseMoney({ staff_id: STAFF, amount: 0 }, '2026-10-09')).toMatchObject({ ok: false });
    expect(parseMoney({ staff_id: STAFF, amount: 500, date: '2026-10-12' }, '2026-10-09')).toMatchObject({ ok: false });
    expect(parseMoney({ staff_id: STAFF, amount: 500, method: 'upi' }, '2026-10-09')).toMatchObject({ ok: true, value: { date: '2026-10-09', method: 'UPI' } });
    expect(paymentPeriod({ period: '2026-09' }, '2026-10-02')).toBe('2026-09');
    expect(paymentPeriod({}, '2026-10-02')).toBe('2026-10');
  });
});

describe('Bills', () => {
  const today = '2026-10-09';
  it('requires a name for "Other", keeps due dates for pending bills and paid dates for paid ones', () => {
    expect(parseBill({ category: 'Other', amount: 100 }, today)).toMatchObject({ ok: false });
    expect(parseBill({ category: 'WiFi', amount: 999 }, today)).toMatchObject({ ok: true, value: { category: 'Internet & phone', status: 'PAID', paid_on: today } });
    expect(parseBill({ category: 'Rent', amount: 40000, status: 'PENDING', due_date: '2026-10-05', payment_method: 'UPI' }, today))
      .toMatchObject({ ok: true, value: { status: 'PENDING', due_date: '2026-10-05', paid_on: null, payment_method: null } });
  });

  it('totals paid, pending and overdue, and spend by category', () => {
    const s = billSummary([
      { category: 'Rent', amount: 40000, status: 'PENDING', due_date: '2026-10-05' },
      { category: 'Electricity', amount: 8000, status: 'PAID' },
      { category: 'Electricity', amount: 500, status: 'PENDING', due_date: '2026-10-20' },
    ], today);
    expect(s).toMatchObject({ paid: 8000, pending: 40500, overdue: 40000, total: 48500, count: 3 });
    expect(s.categories[0]).toEqual({ name: 'Rent', amount: 40000 });
  });

  it('offers last month\'s repeating bills that are not in this month yet', () => {
    const prev = [
      { category: 'Rent', amount: 40000, billing_date: '2026-09-01', is_recurring: true },
      { category: 'Internet & phone', amount: 999, billing_date: '2026-09-03', is_recurring: true },
      { category: 'Marketing', amount: 5000, billing_date: '2026-09-04', is_recurring: false },
    ];
    const due = recurringDue(prev, [{ category: 'Rent', billing_date: '2026-10-01' }], '2026-10');
    expect(due.map((b) => b.category)).toEqual(['Internet & phone']);
  });
});
