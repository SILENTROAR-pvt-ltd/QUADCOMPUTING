'use client';

import type { EodZReport } from '@/lib/services/analytics/eod-z-report.types';
import { money, istTime, ZRow, ZSection } from './ZReportParts';

/** Gross to grand total, the way the bills were charged. */
export function SalesSummarySection({ s }: { s: EodZReport['summary'] }) {
  return (
    <ZSection n={1} title="Sales summary" aside="Settled bills only">
      <ZRow label="Gross sales" value={money(s.gross_sales)} />
      <ZRow label="Discounts" value={`− ${money(s.discounts)}`} tone="minus" />
      {s.wallet_redeemed > 0 && <ZRow label="of which guest wallet credit" value={money(s.wallet_redeemed)} tone="muted" indent />}
      <ZRow label="Net sales (taxable value)" value={money(s.net_sales)} tone="strong" />
      <ZRow label="CGST" value={money(s.cgst)} />
      <ZRow label="SGST" value={money(s.sgst)} />
      {Math.abs(s.round_off) >= 0.01 && <ZRow label="Round off" value={`${s.round_off > 0 ? '+' : '−'} ${money(Math.abs(s.round_off))}`} tone="muted" />}
      <ZRow label="Grand total collected" value={money(s.grand_total)} tone="total" />
    </ZSection>
  );
}

const TENDERS: Array<{ key: keyof EodZReport['tenders']; label: string }> = [
  { key: 'cash', label: 'Cash' }, { key: 'upi', label: 'UPI' }, { key: 'card', label: 'Card' }, { key: 'other', label: 'Split / other' },
];

/** What the money came in as, with each tender's share of the day. */
export function TendersSection({ t, total }: { t: EodZReport['tenders']; total: number }) {
  return (
    <ZSection n={2} title="Payments received">
      {TENDERS.map(({ key, label }) => {
        const pct = total > 0 ? Math.round((t[key] / total) * 1000) / 10 : 0;
        return (
          <div key={key} className="py-1">
            <ZRow label={<span>{label} <span className="ml-1 text-[11px] text-neutral-400">{pct}%</span></span>} value={money(t[key])} />
            <div className="h-1 overflow-hidden rounded-full bg-neutral-100 print:hidden">
              <div className="h-full rounded-full bg-neutral-800" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
      <ZRow label="Total received" value={money(TENDERS.reduce((a, x) => a + t[x.key], 0))} tone="total" />
    </ZSection>
  );
}

/** Bill counts, guests, the trading window, and anything still open or voided. */
export function OperationsSection({ o, n }: { o: EodZReport['operations']; n: number }) {
  return (
    <ZSection n={n} title="Operations">
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 print:grid-cols-2">
        <div>
          <ZRow label="Settled bills" value={o.settled_bills} />
          <ZRow label="Average bill" value={money(o.avg_bill)} />
          <ZRow label="Guests served" value={o.guests} />
        </div>
        <div>
          <ZRow label="First bill" value={istTime(o.first_bill_at)} />
          <ZRow label="Last bill" value={istTime(o.last_bill_at)} />
          <ZRow label={`Voided bills (${o.voids})`} value={money(o.void_value)} tone={o.voids ? 'minus' : 'default'} />
        </div>
      </div>
      {o.open_bills > 0 && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {o.open_bills} bill{o.open_bills > 1 ? 's are' : ' is'} still open ({money(o.open_value)}). Open bills are not in these totals; settle or cancel them before closing the day.
        </p>
      )}
    </ZSection>
  );
}
