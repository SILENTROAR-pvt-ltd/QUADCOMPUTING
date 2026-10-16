'use client';

import React from 'react';
import type { DeliveryPaymentChoice } from './delivery-client';
import type { LocationStatus } from './useGuestLocation';

export const deliveryInput =
  'w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-950 disabled:opacity-50';

interface Props {
  address: string; onAddress: (v: string) => void;
  phone: string; onPhone: (v: string) => void;
  note: string; onNote: (v: string) => void;
  payment: DeliveryPaymentChoice; onPayment: (p: DeliveryPaymentChoice) => void;
  location: { status: LocationStatus; error: string | null; locate: () => void };
  disabled: boolean;
}

/** The guest's address, phone, location and how they will pay. */
export function DeliveryFields(p: Props) {
  const located = p.location.status === 'ok';
  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Delivery address</span>
        <textarea rows={3} value={p.address} onChange={(e) => p.onAddress(e.target.value)} disabled={p.disabled}
          placeholder="Flat or house no., building, street, landmark" className={`${deliveryInput} resize-none`} />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Phone for the rider</span>
        <input type="tel" inputMode="tel" autoComplete="tel" value={p.phone} onChange={(e) => p.onPhone(e.target.value)} disabled={p.disabled}
          placeholder="10-digit mobile" className={deliveryInput} />
      </label>

      <div className="rounded-2xl border border-zinc-200 p-3">
        <button type="button" onClick={p.location.locate} disabled={p.disabled || p.location.status === 'locating'}
          className="h-10 w-full cursor-pointer rounded-xl bg-zinc-100 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-900 hover:bg-zinc-200 disabled:opacity-50">
          {p.location.status === 'locating' ? 'Finding you…' : located ? 'Location shared · update' : 'Use my location to check the range'}
        </button>
        {p.location.error && <p role="alert" className="mt-2 text-xs text-rose-700">{p.location.error}</p>}
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Note for the kitchen (optional)</span>
        <input value={p.note} onChange={(e) => p.onNote(e.target.value)} disabled={p.disabled} maxLength={200}
          placeholder="Ring the bell, less spicy…" className={deliveryInput} />
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">How will you pay?</legend>
        <PaymentOption checked={p.payment === 'cod'} onSelect={() => p.onPayment('cod')} disabled={p.disabled}
          title="Cash on delivery" hint="Pay the rider when the order arrives." />
        <PaymentOption checked={p.payment === 'upi'} onSelect={() => p.onPayment('upi')} disabled={p.disabled}
          title="UPI now" hint="Scan and pay after you place the order. The venue confirms it." />
      </fieldset>
    </div>
  );
}

function PaymentOption({ checked, onSelect, disabled, title, hint }: { checked: boolean; onSelect: () => void; disabled: boolean; title: string; hint: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${checked ? 'border-zinc-950 bg-zinc-50' : 'border-zinc-200'} ${disabled ? 'opacity-50' : ''}`}>
      <input type="radio" name="delivery-payment" checked={checked} onChange={onSelect} disabled={disabled} className="mt-1 accent-zinc-950" />
      <span>
        <span className="block text-sm font-semibold text-zinc-950">{title}</span>
        <span className="block text-xs text-zinc-500">{hint}</span>
      </span>
    </label>
  );
}
