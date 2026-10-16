import type { DaySlip } from '@/lib/services/wallet/day-slips.util';
import { formatRupees } from '../money';
import { dayLabel } from './slip-format';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const FEE_LABEL = { due: 'Due', deducted: 'Paid', cleared: 'Cleared', none: 'No fee' } as const;

/** Opens the day's due slip in a print window: totals first, then every bill. Text is escaped; nothing is fetched. */
export function printSlip(slip: DaySlip): boolean {
  const w = window.open('', '_blank', 'width=480,height=720');
  if (!w) return false;
  const rows = slip.rows.map((r) => `<tr><td>${esc(r.invoice_number)}</td><td>${time(r.created_at)}${r.after_hours ? ' *' : ''}</td>`
    + `<td>${esc(r.where)}</td><td class="r">${formatRupees(r.grand_total)}</td><td class="r">${formatRupees(r.fee)}</td><td>${FEE_LABEL[r.fee_status]}</td></tr>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Due slip ${esc(slip.day)}</title><style>
    body{font:12px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:24px}
    h1{font-size:16px;margin:0}p{margin:2px 0;color:#555}table{width:100%;border-collapse:collapse;margin-top:14px}
    th,td{padding:5px 4px;border-bottom:1px solid #e5e5e5;text-align:left}th{font-size:10px;text-transform:uppercase;color:#666}
    .r{text-align:right}.tot{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
    .tot div{border:1px solid #e5e5e5;border-radius:8px;padding:8px}.tot b{display:block;font-size:14px}
  </style></head><body>
    <h1>Daily due slip · ${esc(dayLabel(slip.day))}</h1>
    <p>Billing window 10:00 AM – 10:00 PM IST · closes at 10:00 PM</p>
    <div class="tot"><div>Bills<b>${slip.bills}</b></div><div>Revenue<b>${formatRupees(slip.revenue)}</b></div>
      <div>Platform fees<b>${formatRupees(slip.fees)}</b></div><div>Fee due<b>${formatRupees(slip.feesDue)}</b></div></div>
    <table><thead><tr><th>Invoice</th><th>Time</th><th>Table</th><th class="r">Bill</th><th class="r">Fee</th><th>Fee status</th></tr></thead>
    <tbody>${rows}</tbody></table>
    ${slip.afterHours ? `<p style="margin-top:10px">* Settled outside 10 AM – 10 PM (${slip.afterHours} ${slip.afterHours === 1 ? 'bill' : 'bills'}).</p>` : ''}
    <script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
}
