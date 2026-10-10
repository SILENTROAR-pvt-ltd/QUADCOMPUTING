'use client';

import type { EodZReport, ZSalesLine } from '@/lib/services/analytics/eod-z-report.types';
import { money, ZSection } from './ZReportParts';

function SalesTable({ rows, label, empty }: { rows: ZSalesLine[]; label: string; empty: string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">
          <th className="py-1.5 text-left font-bold">{label}</th>
          <th className="w-14 py-1.5 text-right font-bold">Qty</th>
          <th className="w-28 py-1.5 text-right font-bold">Net sales</th>
          <th className="w-14 py-1.5 text-right font-bold">Share</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">
        {rows.map((r) => (
          <tr key={r.name} className="break-inside-avoid">
            <td className="py-1.5 pr-2 text-neutral-900">{r.name}</td>
            <td className="py-1.5 text-right font-mono tabular-nums text-neutral-700">{r.qty}</td>
            <td className="py-1.5 text-right font-mono tabular-nums text-neutral-950">{money(r.net_sales)}</td>
            <td className="py-1.5 text-right font-mono text-xs tabular-nums text-neutral-500">{r.share}%</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={4} className="py-4 text-center text-xs text-neutral-400">{empty}</td></tr>
        )}
      </tbody>
    </table>
  );
}

/** Net sales by menu category and by dish; each bill's discount is spread over its lines. */
export function SalesBreakdownSection({ report, n }: { report: EodZReport; n: number }) {
  const qty = report.items.reduce((a, r) => a + r.qty, 0);
  return (
    <ZSection n={n} title="Sales by category and item" aside={`${qty} items sold`}>
      <SalesTable rows={report.categories} label="Category" empty="No sales recorded." />
      <div className="mt-4"><SalesTable rows={report.items} label="Item" empty="No items sold." /></div>
    </ZSection>
  );
}

/** Bills and sales for each hour that had a settled bill. */
export function HourlySection({ hours, n }: { hours: EodZReport['hourly']; n: number }) {
  const peak = Math.max(1, ...hours.map((h) => h.sales));
  return (
    <ZSection n={n} title="Sales by hour" aside="India time">
      {hours.length === 0 ? <p className="py-3 text-center text-xs text-neutral-400">No settled bills in this period.</p> : (
        <ul className="space-y-1">
          {hours.map((h) => (
            <li key={h.hour} className="grid grid-cols-[3.5rem_1fr_3rem_6.5rem] items-center gap-3 text-xs">
              <span className="font-mono text-neutral-500">{h.hour}</span>
              <span className="h-2 overflow-hidden rounded-full bg-neutral-100">
                <span className="block h-full rounded-full bg-neutral-800 print:bg-neutral-600" style={{ width: `${Math.max(3, (h.sales / peak) * 100)}%` }} />
              </span>
              <span className="text-right text-neutral-500">{h.bills} bill{h.bills === 1 ? '' : 's'}</span>
              <span className="text-right font-mono tabular-nums text-neutral-900">{money(h.sales)}</span>
            </li>
          ))}
        </ul>
      )}
    </ZSection>
  );
}
