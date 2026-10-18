'use client';

import React, { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { apiRequest } from '@/lib/utils/api-client';
import type { InvoiceDetail } from '@/lib/services/wallet/invoice-detail.service';
import { formatInvoiceDate, formatRupees } from './money';

const FEE_TEXT = { due: 'Due', deducted: 'Paid from credit', cleared: 'Cleared', none: 'No fee' } as const;

/** Escapes text placed into the printed invoice, so a dish or guest name cannot break the page. */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Prints the invoice from a clean window; nothing is sent anywhere. */
function printInvoice(inv: InvoiceDetail, venue: string): boolean {
  const w = window.open('', '_blank', 'width=520,height=760');
  if (!w) return false;
  const rows = inv.items.map((i) => `<tr><td>${esc(i.name)}${i.notes ? `<br><small>${esc(i.notes)}</small>` : ''}</td>`
    + `<td class="r">${i.qty}</td><td class="r">${formatRupees(i.price)}</td><td class="r">${formatRupees(i.amount)}</td></tr>`).join('');
  const line = (label: string, v: number) => `<tr><td colspan="3">${label}</td><td class="r">${formatRupees(v)}</td></tr>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(inv.invoice_number)}</title><style>
    body{font:12px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:28px}
    h1{font-size:18px;margin:0}h2{font-size:13px;margin:0;color:#555;font-weight:500}
    .meta{margin:14px 0;color:#444}table{width:100%;border-collapse:collapse}
    th,td{padding:6px 4px;border-bottom:1px solid #e5e5e5;text-align:left;vertical-align:top}th{font-size:10px;text-transform:uppercase;color:#666}
    .r{text-align:right}tfoot td{border:0}tfoot tr:last-child td{font-weight:700;font-size:14px;border-top:2px solid #111}
    .status{margin-top:14px;font-size:11px;color:#555}
  </style></head><body>
    <h1>${esc(venue)}</h1><h2>Tax invoice · ${esc(inv.invoice_number)}${inv.order_number ? ` · ${esc(inv.order_number)}` : ''}</h2>
    <div class="meta">${esc(formatInvoiceDate(inv.created_at))} · ${esc(inv.place)}${inv.guest ? ` · ${esc(inv.guest)}` : ''}${inv.payment_method ? ` · Paid by ${esc(inv.payment_method)}` : ''}</div>
    <table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>${line('Subtotal', inv.subtotal)}${inv.discount > 0 ? line('Discount', -inv.discount) : ''}${inv.tax > 0 ? line('Tax', inv.tax) : ''}${inv.delivery_fee > 0 ? line('Delivery fee', inv.delivery_fee) : ''}
      <tr><td colspan="3">Total</td><td class="r">${formatRupees(inv.total)}</td></tr></tfoot></table>
    <p class="status">Platform fee on this bill: ${formatRupees(inv.fee)} · ${esc(FEE_TEXT[inv.fee_status])}</p>
    <script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
}

/** One settled bill in full: its items, discount, tax, payment and the platform fee on it. Loaded only when opened. */
export function InvoiceDetailModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [venueName, setVenueName] = useState('Invoice');
  const [error, setError] = useState<string | null>(null);
  const [printBlocked, setPrintBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest<any>(`/api/host/wallet/invoices/${encodeURIComponent(invoiceId)}`, { cache: 'no-store' }).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data?.success) { setInv(res.data.invoice); setVenueName(res.data.venueName || 'Invoice'); }
      else setError(res.data?.error || 'This invoice could not be loaded.');
    });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelled = true; window.removeEventListener('keydown', onKey); };
  }, [invoiceId, onClose, setVenueName]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="invoice-title" className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-100 p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Invoice</p>
            <h2 id="invoice-title" className="truncate font-mono text-base font-semibold text-neutral-950">{inv?.invoice_number ?? '…'}{inv?.order_number && <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-neutral-700">{inv.order_number}</span>}</h2>
            {inv && <p className="mt-0.5 text-xs text-neutral-500">{formatInvoiceDate(inv.created_at)} · {inv.place}{inv.guest ? ` · ${inv.guest}` : ''}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close invoice" className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-neutral-100"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          {!inv && !error && <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />)}</div>}
          {inv && (
            <>
              <ul className="divide-y divide-neutral-100">
                {inv.items.length === 0 && <li className="py-3 text-xs text-neutral-400">No items recorded on this bill.</li>}
                {inv.items.map((i, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate text-neutral-900">{i.name}</span>
                      <span className="block text-[11px] text-neutral-500">{i.qty} × {formatRupees(i.price)}{i.notes ? ` · ${i.notes}` : ''}</span>
                    </span>
                    <span className="shrink-0 tabular-nums font-medium text-neutral-950">{formatRupees(i.amount)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1.5 border-t border-neutral-200 pt-3 text-sm">
                <div className="flex justify-between text-neutral-600"><dt>Subtotal</dt><dd className="tabular-nums">{formatRupees(inv.subtotal)}</dd></div>
                {inv.discount > 0 && <div className="flex justify-between text-neutral-600"><dt>Discount</dt><dd className="tabular-nums">−{formatRupees(inv.discount)}</dd></div>}
                {inv.tax > 0 && <div className="flex justify-between text-neutral-600"><dt>Tax</dt><dd className="tabular-nums">{formatRupees(inv.tax)}</dd></div>}
                {inv.delivery_fee > 0 && <div className="flex justify-between text-neutral-600"><dt>Delivery fee</dt><dd className="tabular-nums">{formatRupees(inv.delivery_fee)}</dd></div>}
                <div className="flex justify-between pt-1 text-base font-semibold text-neutral-950"><dt>Total</dt><dd className="tabular-nums">{formatRupees(inv.total)}</dd></div>
              </dl>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-neutral-50 p-3 text-xs">
                <div><p className="text-neutral-500">Paid by</p><p className="font-semibold text-neutral-900">{inv.payment_method ?? '—'}</p></div>
                <div><p className="text-neutral-500">Platform fee</p><p className="font-semibold text-neutral-900">{formatRupees(inv.fee)} · {FEE_TEXT[inv.fee_status]}</p></div>
              </div>
            </>
          )}
        </div>

        {inv && (
          <footer className="border-t border-neutral-100 p-4">
            <button type="button" onClick={() => setPrintBlocked(!printInvoice(inv, venueName))}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800">
              <Printer className="h-4 w-4" aria-hidden /> Print invoice
            </button>
            {printBlocked && <p role="alert" className="mt-2 text-center text-[11px] text-amber-700">Allow pop-ups for this site to print.</p>}
          </footer>
        )}
      </div>
    </div>
  );
}
