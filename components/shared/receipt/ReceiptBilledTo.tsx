'use client';

import type { InvoiceData } from '@/lib/utils/receipt-adapter';

/** The guest block of a receipt: name (or wallet handle), wallet, contact, ID and table or room. */
export function ReceiptBilledTo({ invoice }: { invoice: InvoiceData }) {
  const name = invoice.guest_name?.trim() || invoice.guest_handle || 'Walk-in Client';
  const showHandle = Boolean(invoice.guest_handle && invoice.guest_name?.trim());
  return (
    <>
      <p className="mt-1 sm:mt-2">
        <span className="text-neutral-500">Billed To:</span>{' '}
        <span className="font-bold">{name}</span>
      </p>
      {showHandle && <p className="text-neutral-600">Wallet: {invoice.guest_handle}</p>}
      {invoice.guest_phone && <p className="text-neutral-600">Phone: {invoice.guest_phone}</p>}
      {invoice.guest_email && <p className="text-neutral-600">Email: {invoice.guest_email}</p>}
      {(invoice.guest_id_type || invoice.guest_id_number) && (
        <p className="text-neutral-600">
          ID: {invoice.guest_id_type ? `${invoice.guest_id_type} • ` : ''}{invoice.guest_id_number}
        </p>
      )}
      {invoice.guest_address && <p className="text-neutral-600 truncate max-w-xs">Address: {invoice.guest_address}</p>}
      {invoice.table_number && <p className="font-bold text-neutral-900 mt-0.5">Dest: {invoice.table_number}</p>}
    </>
  );
}

/** Discount line label: wallet credit is named as such instead of a generic flat discount. */
export function discountLabel(invoice: InvoiceData): string {
  const wallet = Number(invoice.wallet_redeemed) || 0;
  const discount = Number(invoice.discountAmount) || 0;
  if (wallet > 0 && Math.abs(wallet - discount) < 0.01) return `Wallet credit redeemed${invoice.guest_handle ? ` (${invoice.guest_handle})` : ''}`;
  const base = invoice.discountType === 'percentage' ? `${invoice.discountValue}% Promotional` : `Flat ₹${invoice.discountValue}`;
  return wallet > 0 ? `Discount (${base}, incl. wallet ₹${wallet.toFixed(2)})` : `Discount (${base})`;
}
