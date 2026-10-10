import { shiftPeriod } from './period.util';

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max = 80) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export const BILL_CATEGORIES = [
  'Rent', 'Electricity', 'Water', 'Gas / LPG', 'Internet & phone', 'Maintenance & repairs', 'Cleaning & laundry',
  'Marketing', 'Software & subscriptions', 'Licences & taxes', 'Transport & fuel', 'Insurance', 'Bank & card fees', 'Other',
];
export const BILL_METHODS = ['CASH', 'UPI', 'BANK', 'CARD', 'CHEQUE'];

/** A bill from the form. Paid bills get a paid date; pending ones keep their due date. */
export function parseBill(b: any, today: string): Parsed<Record<string, unknown>> {
  const amount = Number(b?.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) return { ok: false, error: 'Enter an amount more than zero.' };
  const legacy: Record<string, string> = { WiFi: 'Internet & phone' };
  const category = BILL_CATEGORIES.includes(b?.category) ? b.category : legacy[b?.category] || 'Other';
  const custom = text(b?.custom_category_name, 60);
  if (category === 'Other' && !custom) return { ok: false, error: 'Name the expense, e.g. Pest control.' };
  const billing = DATE.test(String(b?.billing_date || '')) ? String(b.billing_date) : today;
  const status = String(b?.status || 'PAID').toUpperCase() === 'PENDING' ? 'PENDING' : 'PAID';
  const due = DATE.test(String(b?.due_date || '')) ? String(b.due_date) : null;
  const method = String(b?.payment_method || '').toUpperCase();
  return {
    ok: true,
    value: {
      category, custom_category_name: category === 'Other' ? custom : null, amount: Math.round(amount * 100) / 100,
      billing_date: billing, status, due_date: status === 'PENDING' ? due : null,
      paid_on: status === 'PAID' ? (DATE.test(String(b?.paid_on || '')) ? String(b.paid_on) : today) : null,
      payment_method: status === 'PAID' && BILL_METHODS.includes(method) ? method : null,
      vendor_name: text(b?.vendor_name), reference: text(b?.reference, 40), notes: text(b?.notes, 240),
      is_recurring: Boolean(b?.is_recurring),
    },
  };
}

export const billName = (b: any) => (b.category === 'Other' ? b.custom_category_name || 'Other' : b.category);
export const isOverdue = (b: any, today: string) => b.status === 'PENDING' && Boolean(b.due_date) && b.due_date < today;

/** The month's bill totals: paid, pending, overdue, and spend by category. */
export function billSummary(bills: any[], today: string) {
  const by = new Map<string, number>();
  let paid = 0, pending = 0, overdue = 0;
  for (const b of bills) {
    const a = Number(b.amount) || 0;
    if (b.status === 'PAID') paid += a; else pending += a;
    if (isOverdue(b, today)) overdue += a;
    by.set(billName(b), (by.get(billName(b)) || 0) + a);
  }
  const categories = Array.from(by.entries()).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  return { paid, pending, overdue, total: paid + pending, count: bills.length, categories };
}

/** Repeating bills from last month that have no entry yet this month: ready to add in one tap. */
export function recurringDue(previous: any[], current: any[], period: string) {
  const have = new Set(current.map((b) => `${billName(b)}|${(b.vendor_name || '').toLowerCase()}`));
  const seen = new Set<string>();
  return previous.filter((b) => {
    const key = `${billName(b)}|${(b.vendor_name || '').toLowerCase()}`;
    if (!b.is_recurring || have.has(key) || seen.has(key)) return false;
    seen.add(key);
    return String(b.billing_date).slice(0, 7) === shiftPeriod(period, -1);
  });
}
