'use client';

import React, { useRef, useState } from 'react';
import { useCartStore, type CartItem } from '@/lib/store/cart.store';
import { rupees } from '@/lib/guest/cashback';
import { DeliveryFields } from './DeliveryFields';
import { useGuestLocation } from './useGuestLocation';
import { useDeliveryTerms } from './useDeliveryTerms';
import {
  buildDeliveryBody, rememberActiveDelivery, sendDeliveryOrder,
  type DeliveryPaymentChoice, type ActiveDelivery,
} from './delivery-client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cafeId: string;
  cartItems: CartItem[];
  subtotal: number;
  /** Called once the venue has accepted the order, after the cart is cleared and the order is remembered on this device. */
  onPlaced: (delivery: ActiveDelivery) => void;
}

const readStored = (key: string) => (typeof window !== 'undefined' ? window.localStorage.getItem(key) || '' : '');

/** The guest's delivery checkout: address, phone, location, payment, then the venue's own rules decide. */
export function DeliveryCheckoutSheet({ isOpen, onClose, cafeId, cartItems, subtotal, onPlaced }: Props) {
  const { terms, loading } = useDeliveryTerms(isOpen ? cafeId : '');
  const location = useGuestLocation();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(() => readStored('quad_guest_phone'));
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<DeliveryPaymentChoice>('cod');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Same dish list, address and phone as the last try: the same key, so a retry cannot place a second order.
  const attemptRef = useRef<{ sig: string; key: string } | null>(null);

  if (!isOpen) return null;

  const fee = terms?.enabled ? Number(terms.fee) || 0 : 0;
  const minOrder = Number(terms?.min_order) || 0;
  const belowMinimum = minOrder > 0 && subtotal < minOrder;
  const phoneDigits = phone.replace(/[^\d]/g, '');
  const detailsReady = address.trim().length >= 10 && phoneDigits.length >= 10 && location.status === 'ok' && location.point !== null;
  const canSend = Boolean(terms?.enabled) && !belowMinimum && detailsReady && cartItems.length > 0 && !sending;
  const disabled = sending || !terms?.enabled;

  const place = async () => {
    if (!canSend || !location.point) return;
    setSending(true); setError(null);
    const details = { address, phone, lat: location.point.lat, lng: location.point.lng, payment };
    const sig = JSON.stringify([details, note, cartItems.map((c) => [c.item_id, c.quantity, c.notes || '', c.selected_addons])]);
    if (attemptRef.current?.sig !== sig) {
      const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      attemptRef.current = { sig, key: `dl-${rand}` };
    }
    const body = buildDeliveryBody({
      cafeId, items: cartItems, guestName: readStored('quad_guest_name') || 'Guest', tableNote: note, details, attemptKey: attemptRef.current.key,
    });
    const result = await sendDeliveryOrder(body);
    setSending(false);
    if (!result.ok) { setError(result.error); return; }

    attemptRef.current = null;
    const delivery: ActiveDelivery = { orderId: result.orderId, payment: result.payment, total: result.grandTotal, placedAt: Date.now() };
    rememberActiveDelivery(cafeId, delivery);
    useCartStore.getState().clearCart();
    window.dispatchEvent(new CustomEvent('guest-delivery:placed', { detail: { cafeId } }));
    onPlaced(delivery);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="delivery-checkout-title" className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="delivery-checkout-title" className="font-serif text-2xl text-zinc-950">Order for delivery</h2>
            <p className="mt-1 text-xs text-zinc-500">Your dishes go to the kitchen with your address. Taxes, if any, are added on the bill.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close delivery checkout" className="cursor-pointer rounded-full px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-100">Close</button>
        </header>

        <div className="mt-5 flex-1 space-y-5 overflow-y-auto overscroll-contain pb-2">
          {loading && <p className="text-sm text-zinc-500">Checking delivery at this venue…</p>}
          {!loading && terms && !terms.enabled && <p className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">This venue is not taking delivery orders right now. Please order at the table.</p>}

          {terms?.enabled && (
            <>
              <p className="rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-600">
                We deliver within {terms.radius_km} km{minOrder > 0 ? ` · minimum ₹${minOrder} of food` : ''}{fee > 0 ? ` · delivery fee ${rupees(fee)}` : ' · free delivery'}.
              </p>
              <DeliveryFields
                address={address} onAddress={setAddress} phone={phone} onPhone={setPhone} note={note} onNote={setNote}
                payment={payment} onPayment={setPayment} location={location} disabled={sending}
              />
              <dl className="space-y-1 rounded-2xl border border-zinc-200 p-4 text-sm">
                <div className="flex justify-between"><dt className="text-zinc-600">Food</dt><dd className="tabular-nums">{rupees(subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-600">Delivery fee</dt><dd className="tabular-nums">{fee > 0 ? rupees(fee) : 'Free'}</dd></div>
                <div className="flex justify-between border-t border-zinc-100 pt-2 font-bold text-zinc-950"><dt>Estimated total</dt><dd className="tabular-nums">{rupees(subtotal + fee)}</dd></div>
              </dl>
              {belowMinimum && <p role="alert" className="text-sm text-amber-700">Add {rupees(minOrder - subtotal)} more of food to order delivery. The minimum is {rupees(minOrder)}.</p>}
            </>
          )}
          {terms?.enabled && cartItems.length === 0 && <p className="rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-700">Your tray is empty. Pick dishes from the menu, then order for delivery.</p>}
          {error && <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        </div>

        {terms?.enabled && (
          <button type="button" onClick={place} disabled={!canSend || disabled}
            className="mt-4 flex w-full cursor-pointer items-center justify-center rounded-2xl bg-zinc-950 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white hover:bg-zinc-800 disabled:opacity-50">
            {sending ? 'Sending to kitchen…' : 'Place delivery order'}
          </button>
        )}
      </div>
    </div>
  );
}
