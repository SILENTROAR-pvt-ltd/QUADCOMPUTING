import { CANCELLED_STATUSES, SETTLED_STATUSES } from '@/lib/utils/business-day';
import type { ZFigures, ZTenders } from './eod-z-report.types';
import { hourlySales, normaliseBill, round2, salesBreakdown } from './z-report-sales.util';
import { realName } from './guest-identity.util';

const num = (v: unknown) => Number(v) || 0;
const SETTLED = new Set<string>(SETTLED_STATUSES);
const CANCELLED = new Set<string>(CANCELLED_STATUSES);

/** What the bill charged: the stored total, or net + tax for rows written without one. */
export const billTotal = (o: any) => num(o.grand_total) || num(o.subtotal) - num(o.discount_amount) + num(o.tax_amount);

function tenderOf(method: unknown): 'cash' | 'upi' | 'card' | 'other' {
  const m = String(method || '').toLowerCase();
  return m === 'cash' || m === 'upi' || m === 'card' ? m : 'other';
}

/** A guest is the same person across bills when the phone, wallet session or name matches. */
function guestKey(o: any): string | null {
  const phone = String(o.customer_phone || '').trim();
  if (phone) return `p:${phone}`;
  if (o.session_id) return `s:${o.session_id}`;
  const name = realName(o.customer_name) || realName(o.guest_name);
  return name ? `n:${name.toLowerCase()}` : null;
}

/**
 * The end-of-day figures. Only settled bills are sales; open bills and voids are
 * reported beside them so the till can be closed with nothing left unaccounted.
 */
export function buildZFigures(rows: any[], walletRedeemed: number, categoryOf: (name: string) => string | null): ZFigures {
  const all = rows.map(normaliseBill);
  const settled = all.filter((o) => SETTLED.has(o.status));
  const open = all.filter((o) => !SETTLED.has(o.status) && !CANCELLED.has(o.status));
  const voided = all.filter((o) => CANCELLED.has(o.status));

  let gross = 0, discounts = 0, tax = 0, charged = 0;
  const tenders: ZTenders = { cash: 0, upi: 0, card: 0, other: 0, cash_received: 0, change_given: 0 };
  const guests = new Set<string>();
  for (const o of settled) {
    gross += num(o.subtotal);
    discounts += num(o.discount_amount);
    tax += num(o.tax_amount);
    charged += billTotal(o);
    const tender = tenderOf(o.payment_method);
    tenders[tender] += billTotal(o);
    // The drawer's side of a cash bill: the notes handed over and the change returned (exact cash when not recorded).
    if (tender === 'cash') {
      const change = num(o.cash_change);
      tenders.cash_received += o.cash_tendered !== null && o.cash_tendered !== undefined ? num(o.cash_tendered) : billTotal(o);
      tenders.change_given += change;
    }
    const key = guestKey(o);
    if (key) guests.add(key);
  }

  const net = round2(gross - discounts);
  const totalTax = round2(tax);
  const cgst = round2(totalTax / 2);
  const times = settled.map((o) => o.created_at).filter(Boolean).sort();
  const { items, categories } = salesBreakdown(settled, categoryOf, net);

  return {
    summary: {
      gross_sales: round2(gross), discounts: round2(discounts), wallet_redeemed: round2(walletRedeemed),
      net_sales: net, cgst, sgst: round2(totalTax - cgst), total_tax: totalTax,
      round_off: round2(charged - (net + totalTax)), grand_total: round2(charged),
    },
    tenders: { cash: round2(tenders.cash), upi: round2(tenders.upi), card: round2(tenders.card), other: round2(tenders.other), cash_received: round2(tenders.cash_received), change_given: round2(tenders.change_given) },
    operations: {
      settled_bills: settled.length,
      avg_bill: settled.length ? round2(charged / settled.length) : 0,
      guests: guests.size,
      open_bills: open.length,
      open_value: round2(open.reduce((a, o) => a + billTotal(o), 0)),
      voids: voided.length,
      void_value: round2(voided.reduce((a, o) => a + billTotal(o), 0)),
      first_bill_at: times[0] || null,
      last_bill_at: times[times.length - 1] || null,
    },
    categories,
    items,
    hourly: hourlySales(settled, billTotal),
  };
}
