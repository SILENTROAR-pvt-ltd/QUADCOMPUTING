import { isPeriod } from './period.util';

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max = 80) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
export const ROLES = ['MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'HOUSEKEEPING', 'OTHER'];
export const METHODS = ['CASH', 'UPI', 'BANK', 'OTHER'];

export function parseStaff(b: any): Parsed<Record<string, unknown>> {
  const name = text(b?.name);
  if (!name) return { ok: false, error: 'Enter the employee’s name.' };
  const salary = Number(b?.base_salary);
  if (!Number.isFinite(salary) || salary < 0 || salary > 10_000_000) return { ok: false, error: 'Enter a monthly salary of 0 or more.' };
  const join = String(b?.join_date || '');
  if (!DATE.test(join)) return { ok: false, error: 'Enter the joining date.' };
  const phone = String(b?.contact_number || '').replace(/[^\d+]/g, '');
  if (phone && phone.replace(/\D/g, '').length < 10) return { ok: false, error: 'Enter a 10-digit phone number, or leave it blank.' };
  const role = String(b?.role || 'OTHER').toUpperCase();
  return {
    ok: true,
    value: {
      name, base_salary: Math.round(salary * 100) / 100, join_date: join, contact_number: phone || null,
      designation: text(b?.designation, 60), department: text(b?.department, 60), role: ROLES.includes(role) ? role : 'OTHER',
    },
  };
}

interface Money { staff_id: string; amount: number; date: string; method: string; notes: string | null }

/** An advance or a salary payment: who, how much, when and how it was paid. */
export function parseMoney(b: any, today: string): Parsed<Money> {
  if (!UUID.test(String(b?.staff_id || ''))) return { ok: false, error: 'Choose an employee.' };
  const amount = Number(b?.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return { ok: false, error: 'Enter an amount more than zero.' };
  const date = DATE.test(String(b?.date || '')) ? String(b.date) : today;
  if (date > today) return { ok: false, error: 'The date cannot be in the future.' };
  const method = String(b?.method || 'CASH').toUpperCase();
  return {
    ok: true,
    value: { staff_id: String(b.staff_id), amount: Math.round(amount * 100) / 100, date, method: METHODS.includes(method) ? method : 'OTHER', notes: text(b?.notes, 200) },
  };
}

/** Last working day: the date given if it is not in the future, otherwise today. */
export const leavingDate = (v: string | null, today: string) => (v && DATE.test(v) && v <= today ? v : today);

/** The payroll month a salary payment settles: given, or the month of the payment date. */
export const paymentPeriod = (b: any, date: string) => (isPeriod(b?.period) ? b.period : date.slice(0, 7));
