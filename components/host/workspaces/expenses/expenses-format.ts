import type { PayStatus } from '@/lib/services/expenses/payroll.util';

export const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const shortDate = (ymd: string | null | undefined) =>
  ymd ? new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '—';

export const PAY_STYLE: Record<PayStatus, { label: string; chip: string }> = {
  paid: { label: 'Paid', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  partly: { label: 'Part paid', chip: 'bg-amber-50 text-amber-800 ring-amber-200' },
  due: { label: 'Due', chip: 'bg-sky-50 text-sky-800 ring-sky-200' },
  overpaid: { label: 'Overpaid', chip: 'bg-rose-50 text-rose-800 ring-rose-200' },
  none: { label: '—', chip: 'bg-neutral-100 text-neutral-600 ring-neutral-200' },
};

export const ROLE_LABEL: Record<string, string> = {
  MANAGER: 'Manager', CASHIER: 'Cashier', WAITER: 'Waiter / server', KITCHEN: 'Kitchen / chef',
  HOUSEKEEPING: 'Housekeeping', OTHER: 'Other',
};

export const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', UPI: 'UPI', BANK: 'Bank transfer', CARD: 'Card', CHEQUE: 'Cheque', OTHER: 'Other' };

/** Sends JSON and returns the body, or throws the server's message. */
export async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' }).catch(() => null);
  const json = res ? await res.json().catch(() => ({})) : {};
  if (!res?.ok) throw new Error(json.error || 'No connection. Nothing was saved.');
  return json;
}
