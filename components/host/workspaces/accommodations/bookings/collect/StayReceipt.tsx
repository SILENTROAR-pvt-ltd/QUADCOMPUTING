'use client';

import React from 'react';
import { ThermalReceiptView } from '@/components/shared/receipt/ThermalReceiptView';
import type { InvoiceData } from '@/lib/utils/receipt-adapter';
import type { Receipt } from './useCollect';

const METHOD = { UPI: 'UPI', CASH: 'CASH', CARD: 'CARD' } as const;

/**
 * The room payment as the platform's own tax invoice: the same receipt the POS prints (venue name, address and GSTIN from the
 * venue's profile, invoice number from the bill, itemised lines under ROOM STAY, totals, amount in words), marked as paid.
 * Printing prints this alone, on 80 mm paper.
 */
export function StayReceipt({ receipt, businessName, upiId }: { receipt: Receipt; businessName: string; upiId: string | null }) {
  const { quote } = receipt;
  const invoice: InvoiceData = {
    id: receipt.billId || undefined,
    created_at: receipt.paidAt,
    guest_name: quote.guestName,
    guest_phone: quote.guestPhone || undefined,
    table_number: quote.title,
    items: quote.lines.map((l) => ({ id: l.id, name: l.name, price: l.price, qty: l.qty, notes: l.notes, section: l.id === 'tariff' ? 'ACCOMMODATION' : 'ADD_ON' })),
    subtotal: quote.amount,
    discountAmount: 0,
    taxAmount: 0,
    grandTotal: quote.amount,
    cash_tendered: receipt.cashGiven ?? null,
    cash_change: receipt.change ?? null,
    isReadOnly: true,
  };
  const paid = receipt.tender ? `PAID · ${METHOD[receipt.tender]}` : 'PAID';

  return (
    <div id="stay-bill" className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <style>{'@media print { body * { visibility: hidden !important; } #stay-bill, #stay-bill * { visibility: visible !important; } #stay-bill { position: absolute; left: 0; top: 0; width: 100%; border: 0; } }'}</style>
      <ThermalReceiptView invoice={invoice} paymentMethod={paid} masterUpiHandle={upiId || undefined} businessDisplayName={businessName} showPayQr={false} />
      {receipt.reference && <p className="border-t border-dashed border-neutral-300 bg-white px-4 pb-4 pt-3 text-center font-mono text-[10px] text-neutral-600">Payment reference {receipt.reference}</p>}
    </div>
  );
}
