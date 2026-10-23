'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import type { DeliveryPaymentChoice } from './delivery-client';
import type { LocationStatus } from './useGuestLocation';

export const deliveryInput =
  'w-full rounded-2xl border border-[#e8dfcc] bg-[#fffdf8] px-4 py-3 text-[15px] text-[#10231a] outline-none transition-shadow placeholder:text-[#10231a]/35 focus:border-[#b08d57]/70 focus:shadow-[0_0_0_4px_rgba(217,193,147,0.2)] disabled:opacity-50 sm:text-sm';
const label = 'text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#8a6d3f]';

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
        <span className={label}>Delivery address</span>
        <textarea rows={3} value={p.address} onChange={(e) => p.onAddress(e.target.value)} disabled={p.disabled}
          placeholder="Flat or house no., building, street, landmark" className={`${deliveryInput} resize-none`} />
      </label>

      <label className="block space-y-1.5">
        <span className={label}>Phone for the rider</span>
        <input type="tel" inputMode="tel" autoComplete="tel" value={p.phone} onChange={(e) => p.onPhone(e.target.value)} disabled={p.disabled}
          placeholder="10-digit mobile" className={deliveryInput} />
      </label>

      <div>
        <button type="button" onClick={p.location.locate} disabled={p.disabled || p.location.status === 'locating'}
          className={`flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full border text-[13px] font-semibold transition-colors disabled:opacity-50 ${
            located ? 'border-[#0f2a1e]/20 bg-[#f3ecdc] text-[#173a2a]' : 'border-[#d9c193] bg-[#fbf9f4] text-[#5c4626] hover:bg-[#f6efe0]'
          }`}>
          <MapPin className="h-4 w-4 text-[#8a6d3f]" aria-hidden />
          {p.location.status === 'locating' ? 'Finding you…' : located ? 'Location shared · update' : 'Use my location to check the range'}
        </button>
        {p.location.error && <p role="alert" className="mt-2 text-xs text-rose-700">{p.location.error}</p>}
      </div>

      <label className="block space-y-1.5">
        <span className={label}>Note for the kitchen (optional)</span>
        <input value={p.note} onChange={(e) => p.onNote(e.target.value)} disabled={p.disabled} maxLength={200}
          placeholder="Ring the bell, less spicy…" className={deliveryInput} />
      </label>

      <fieldset className="space-y-2">
        <legend className={`mb-1.5 ${label}`}>How will you pay?</legend>
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
    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors ${
      checked ? 'border-[#0f2a1e]/40 bg-[#f3ecdc] shadow-[0_0_0_3px_rgba(217,193,147,0.18)]' : 'border-[#e8dfcc] bg-[#fffdf8] hover:bg-[#f8f4ea]'
    } ${disabled ? 'opacity-50' : ''}`}>
      <input type="radio" name="delivery-payment" checked={checked} onChange={onSelect} disabled={disabled} className="mt-1 accent-[#0f2a1e]" />
      <span>
        <span className="block text-[14px] font-semibold text-[#10231a]">{title}</span>
        <span className="block text-[12px] text-[#10231a]/55">{hint}</span>
      </span>
    </label>
  );
}
