'use client';

import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useCartStore, type CartItem } from '@/lib/store/cart.store';
import { rupees } from '@/lib/guest/cashback';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { DeliveryFields } from './DeliveryFields';
import { DeliveryResting } from './DeliveryResting';
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
const note = 'rounded-2xl border border-[#e8dfcc] bg-[#f8f4ea] p-3.5 text-[13px] leading-relaxed text-[#10231a]/70';

/** The guest's delivery checkout on the menu's ivory: address, phone, location, payment, then the venue's own rules decide. */
export function DeliveryCheckoutSheet({ isOpen, onClose, cafeId, cartItems, subtotal, onPlaced }: Props) {
  const { terms, loading } = useDeliveryTerms(isOpen ? cafeId : '');
  const location = useGuestLocation();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(() => readStored('quad_guest_phone'));
  const [kitchenNote, setKitchenNote] = useState('');
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
    const sig = JSON.stringify([details, kitchenNote, cartItems.map((c) => [c.item_id, c.quantity, c.notes || '', c.selected_addons])]);
    if (attemptRef.current?.sig !== sig) {
      const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      attemptRef.current = { sig, key: `dl-${rand}` };
    }
    const body = buildDeliveryBody({
      cafeId, items: cartItems, guestName: readStored('quad_guest_name') || 'Guest', tableNote: kitchenNote, details, attemptKey: attemptRef.current.key,
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
    <div role="dialog" aria-modal="true" aria-labelledby="delivery-checkout-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#08160f]/55 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[30px] border-t border-[#e8dfcc] bg-[#fbf9f4] p-5 pb-[calc(env(safe-area-inset-bottom,16px)+1rem)] shadow-2xl sm:rounded-[28px] sm:border sm:p-7">
        <span aria-hidden className="mx-auto -mt-1 mb-3 h-1 w-10 rounded-full bg-[#e2d6bd] sm:hidden" />
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f]">Delivery</p>
            <h2 id="delivery-checkout-title" className="mt-1 text-[30px] leading-none text-[#10231a]" style={LUXE_SERIF}>Order for <em className="text-[#8a6d3f]">delivery</em></h2>
            <p className="mt-2 text-[12.5px] leading-snug text-[#10231a]/55">Your dishes go to the kitchen with your address. Taxes, if any, are added on the bill.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close delivery checkout"
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-[#10231a]/50 ring-1 ring-[#e8dfcc] hover:bg-[#f3ecdc] hover:text-[#10231a]">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mt-5 flex-1 space-y-5 overflow-y-auto overscroll-contain pb-2">
          {loading && <p className="text-[13px] text-[#10231a]/55">Checking delivery at this venue…</p>}
          {!loading && terms && !terms.enabled && <DeliveryResting onBack={onClose} />}

          {terms?.enabled && (
            <>
              <p className={note}>
                We deliver within {terms.radius_km} km{minOrder > 0 ? ` · minimum ₹${minOrder} of food` : ''}{fee > 0 ? ` · delivery fee ${rupees(fee)}` : ' · free delivery'}.
              </p>
              <DeliveryFields
                address={address} onAddress={setAddress} phone={phone} onPhone={setPhone} note={kitchenNote} onNote={setKitchenNote}
                payment={payment} onPayment={setPayment} location={location} disabled={sending}
              />
              <dl className="space-y-1.5 rounded-2xl border border-[#e8dfcc] bg-[#fffdf8] p-4 text-[13px] text-[#10231a]">
                <div className="flex justify-between"><dt className="text-[#10231a]/60">Food</dt><dd className="tabular-nums">{rupees(subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-[#10231a]/60">Delivery fee</dt><dd className="tabular-nums">{fee > 0 ? rupees(fee) : 'Free'}</dd></div>
                <div className="flex justify-between border-t border-[#efe6d4] pt-2 font-semibold"><dt>Estimated total</dt><dd className="tabular-nums">{rupees(subtotal + fee)}</dd></div>
              </dl>
              {belowMinimum && <p role="alert" className="text-[13px] text-[#8a5a12]">Add {rupees(minOrder - subtotal)} more of food to order delivery. The minimum is {rupees(minOrder)}.</p>}
            </>
          )}
          {terms?.enabled && cartItems.length === 0 && <p className={note}>Your tray is empty. Pick dishes from the menu, then order for delivery.</p>}
          {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-800">{error}</p>}
        </div>

        {terms?.enabled && (
          <button type="button" onClick={place} disabled={!canSend || disabled}
            className="mt-4 flex w-full cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#0f2a1e] via-[#143524] to-[#1d4632] py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5f1e8] shadow-[0_14px_28px_-14px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/35 disabled:opacity-50">
            {sending ? 'Sending to kitchen…' : 'Place delivery order'}
          </button>
        )}
      </div>
    </div>
  );
}
