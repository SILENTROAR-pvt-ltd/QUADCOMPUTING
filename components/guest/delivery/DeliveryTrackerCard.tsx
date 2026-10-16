'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { DynamicUpiQr } from '@/components/host/billing/DynamicUpiQr';
import { rupees } from '@/lib/guest/cashback';
import { DELIVERY_STATUSES, DELIVERY_STATUS_LABEL, type DeliveryStatus } from '@/lib/services/delivery/delivery-rules';
import { forgetActiveDelivery, readActiveDelivery, type ActiveDelivery } from './delivery-client';
import { useDeliveryTerms } from './useDeliveryTerms';

interface DeliveryStatusReply {
  delivery_status: DeliveryStatus;
  delivery_payment: 'cod' | 'upi_advance' | null;
  delivery_paid: boolean;
  grand_total: number;
}

const POLL_MS = 20_000;

/** Shows the delivery this device placed: its stage, and the UPI code to pay when the guest chose to pay now. */
export function DeliveryTrackerCard({ venueId }: { venueId: string }) {
  const [active, setActive] = useState<ActiveDelivery | null>(null);
  const [status, setStatus] = useState<DeliveryStatusReply | null>(null);
  const { terms } = useDeliveryTerms(active ? venueId : '');

  const refresh = useCallback(() => setActive(readActiveDelivery(venueId)), [venueId]);

  useEffect(() => {
    refresh();
    window.addEventListener('guest-delivery:placed', refresh);
    return () => window.removeEventListener('guest-delivery:placed', refresh);
  }, [refresh]);

  useEffect(() => {
    if (!active) { setStatus(null); return; }
    let cancelled = false;
    const load = () => {
      fetch(`/api/guest/delivery?business_id=${encodeURIComponent(venueId)}&order_id=${encodeURIComponent(active.orderId)}`, { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => { if (!cancelled && json?.success) setStatus(json as DeliveryStatusReply); })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [active, venueId]);

  if (!active) return null;
  const stage = status?.delivery_status ?? 'received';
  const stageIndex = DELIVERY_STATUSES.indexOf(stage);
  const delivered = stage === 'delivered';
  const showQr = active.payment === 'upi_advance' && status !== null && !status.delivery_paid && Boolean(terms?.upi_id);

  const dismiss = () => { forgetActiveDelivery(venueId); setActive(null); };

  return (
    <section aria-label="Your delivery" className="mx-auto mt-4 w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-zinc-950">{delivered ? 'Delivered' : 'Your delivery'}</h2>
        <span className="text-xs text-zinc-500">{status ? rupees(status.grand_total) : ''}</span>
      </header>

      <ol className="mt-4 grid grid-cols-4 gap-1 text-center text-[11px] font-semibold text-zinc-500">
        {DELIVERY_STATUSES.map((s, i) => (
          <li key={s} className={i <= stageIndex ? 'text-zinc-950' : ''}>
            <span className={`mx-auto mb-1 block h-1.5 rounded-full ${i <= stageIndex ? 'bg-zinc-950' : 'bg-zinc-200'}`} />
            {DELIVERY_STATUS_LABEL[s]}
          </li>
        ))}
      </ol>

      {showQr && terms?.upi_id && (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl bg-zinc-50 p-4">
          <p className="text-xs text-zinc-600">Pay {rupees(status!.grand_total)} now, then the venue confirms it.</p>
          <DynamicUpiQr upiId={terms.upi_id} businessName={terms.business_name} amount={status!.grand_total} orderId={active.orderId} size={150} />
        </div>
      )}
      {status && active.payment === 'upi_advance' && status.delivery_paid && (
        <p className="mt-4 text-center text-xs font-semibold text-emerald-700">Payment received. Thank you.</p>
      )}
      {status && active.payment === 'cod' && !delivered && (
        <p className="mt-4 text-center text-xs text-zinc-500">Pay {rupees(status.grand_total)} in cash when it arrives.</p>
      )}

      {delivered && (
        <button type="button" onClick={dismiss} className="mt-4 h-10 w-full cursor-pointer rounded-xl bg-zinc-100 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-900 hover:bg-zinc-200">
          Done
        </button>
      )}
    </section>
  );
}
