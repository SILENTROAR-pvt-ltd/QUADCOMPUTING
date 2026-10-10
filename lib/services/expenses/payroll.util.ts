import { daysInclusive, periodRange } from './period.util';

export type PayStatus = 'paid' | 'partly' | 'due' | 'overpaid' | 'none';

export interface PayrollRow {
  id: string; name: string; contact_number: string | null; designation: string | null; department: string | null;
  role: string | null; join_date: string; end_date: string | null; status: string; base_salary: number;
  /** Salary earned this month: the full salary, or pro-rated by days for a joiner or leaver. */
  payable: number; prorated_days: number | null;
  advances: number; paid: number; balance: number; pay_status: PayStatus;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => Number(v) || 0;

/** Salary earned in the month: full, pro-rated for days employed, or nothing outside employment. */
export function salaryFor(base: number, join: string, end: string | null, period: string) {
  const { first, last, days } = periodRange(period);
  const from = join > first ? join : first;
  const to = end && end < last ? end : last;
  if (from > to) return { payable: 0, days: 0 };
  const worked = daysInclusive(from, to);
  return worked >= days ? { payable: r2(base), days: null } : { payable: r2((base * worked) / days), days: worked };
}

function payStatus(payable: number, settled: number): PayStatus {
  if (payable <= 0 && settled <= 0) return 'none';
  if (settled > payable + 0.5) return 'overpaid';
  if (settled >= payable - 0.5) return 'paid';
  return settled > 0 ? 'partly' : 'due';
}

/**
 * Each employee's month: salary earned, advances taken, salary paid, and the balance still owed.
 * Staff who left before the month (or joined after it) and have no money moved are left out.
 */
export function buildPayroll(staff: any[], advances: any[], payments: any[], period: string) {
  const sum = (rows: any[], id: string) => rows.filter((r) => r.staff_id === id).reduce((s, r) => s + num(r.amount), 0);
  const rows: PayrollRow[] = [];
  for (const s of staff) {
    const { payable, days } = salaryFor(num(s.base_salary), String(s.join_date), s.end_date || null, period);
    const adv = r2(sum(advances, s.id));
    const paid = r2(sum(payments, s.id));
    if (payable === 0 && adv === 0 && paid === 0) continue;
    rows.push({
      id: s.id, name: s.name, contact_number: s.contact_number || null, designation: s.designation || null,
      department: s.department || null, role: s.role || null, join_date: s.join_date, end_date: s.end_date || null,
      status: s.status || 'ACTIVE', base_salary: num(s.base_salary), payable, prorated_days: days,
      advances: adv, paid, balance: r2(payable - adv - paid), pay_status: payStatus(payable, adv + paid),
    });
  }
  rows.sort((a, b) => Number(a.status !== 'ACTIVE') - Number(b.status !== 'ACTIVE') || a.name.localeCompare(b.name));
  const total = (k: 'payable' | 'advances' | 'paid') => r2(rows.reduce((s, r) => s + r[k], 0));
  return {
    rows,
    totals: {
      headcount: rows.filter((r) => r.status === 'ACTIVE').length,
      payable: total('payable'), advances: total('advances'), paid: total('paid'),
      outstanding: r2(rows.reduce((s, r) => s + Math.max(0, r.balance), 0)),
    },
  };
}
