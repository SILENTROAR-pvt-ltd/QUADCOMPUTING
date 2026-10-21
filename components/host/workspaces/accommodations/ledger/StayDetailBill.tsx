'use client';

import React from 'react';
import { Receipt, Sparkles } from 'lucide-react';
import type { StayDetail } from '@/lib/services/accommodation/stay-detail.service';
import { inr, statusLabel, when } from './stay-format';

const ROW = 'flex items-start justify-between gap-3 text-sm';

/** The money of the stay: the invoice the checkout issued, line by line, what was paid before, and the guest's cashback. */
export function StayDetailBill({ detail }: { detail: StayDetail }) {
  const { invoice, advances, cashback, stay } = detail;
  const advance = advances.reduce((s, o) => s + o.grand_total, 0) || Number(stay.advance_paid) || 0;
  const billed = Number(stay.total_billed_amount) || invoice?.grand_total || 0;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white" aria-label="Bill">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-950"><Receipt className="h-4 w-4 text-neutral-500" aria-hidden />{invoice ? `Invoice ${invoice.invoice_number || `#${invoice.id.slice(0, 8).toUpperCase()}`}` : 'Bill'}</p>
        {invoice && <span className="text-xs text-neutral-500">{when(invoice.created_at)} · {statusLabel(invoice.status)}{invoice.payment_method ? ` · ${invoice.payment_method}` : ''}</span>}
      </div>

      <div className="space-y-2 px-4 py-3">
        {invoice && invoice.items.length > 0 ? invoice.items.map((l, i) => (
          <div key={i} className={ROW}>
            <span className="min-w-0 text-neutral-800"><span className="font-mono text-neutral-500">{l.qty}×</span> {l.name}{l.notes ? <span className="block text-xs text-neutral-500">{l.notes}</span> : null}</span>
            <span className="shrink-0 font-mono text-neutral-900">{inr(l.price * l.qty)}</span>
          </div>
        )) : <p className="text-sm text-neutral-500">{invoice ? 'The invoice carries no lines.' : 'This stay was closed without a tax invoice; the amounts below are from the stay log.'}</p>}

        <div className="space-y-1.5 border-t border-neutral-100 pt-2">
          {invoice && invoice.tax_amount > 0 && <div className={`${ROW} text-neutral-600`}><span>Taxes</span><span className="font-mono">{inr(invoice.tax_amount, true)}</span></div>}
          <div className={ROW}><span className="font-semibold text-neutral-950">Stay total</span><span className="font-mono font-semibold text-neutral-950">{inr(billed, true)}</span></div>
          {advance > 0 && (
            <>
              <div className={`${ROW} text-emerald-800`}><span>Paid before checkout{advances.length ? ` (${advances.map((a) => a.payment_method || 'desk').join(', ')})` : ''}</span><span className="font-mono">−{inr(advance, true)}</span></div>
              <div className={ROW}><span className="font-semibold text-neutral-950">Paid at checkout</span><span className="font-mono font-semibold text-neutral-950">{inr(Math.max(0, (invoice?.grand_total ?? billed - advance)), true)}</span></div>
            </>
          )}
        </div>

        {cashback && (
          <p className="mt-1 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
            <span><strong>{inr(cashback.amount, true)}</strong> cashback credited to {cashback.handle}&apos;s Vibers wallet on this invoice.</span>
          </p>
        )}
      </div>
    </section>
  );
}
