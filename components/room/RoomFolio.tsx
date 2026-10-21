'use client';

import React from 'react';
import { Wallet, UtensilsCrossed } from 'lucide-react';
import { inr, plural } from '@/components/stay/stay-format';
import { StayNotice } from '@/components/stay/StayShell';
import { RoomInvoiceCard } from './RoomInvoiceCard';
import { RoomOrdersList } from './RoomOrdersList';
import type { RoomState } from './useRoomStay';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const heading = 'text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500';
const row = 'flex items-start justify-between gap-3 py-2.5 text-sm';

/**
 * The bill. First what stands to be paid; then the room's tax invoice as the desk issued it; then the running stay (the
 * nights so far, the advance credited against them) and the food and drinks charged to the room. Settled at the desk at checkout.
 */
export function RoomFolio({ data }: { data: RoomState }) {
  const { folio, invoice, business, room } = data;
  if (!folio) return <StayNotice>Your bill will appear here.</StayNotice>;
  const owes = folio.balance > 0;
  const paid = folio.advance_paid > 0;

  return (
    <div className="space-y-4">
      <section className={`rounded-[1.75rem] border p-5 sm:p-6 ${owes ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={`${heading} ${owes ? 'text-amber-800' : 'text-emerald-800'}`}>{owes ? 'To pay at checkout' : 'Nothing to pay right now'}</p>
            <p className={`mt-1 text-sm ${owes ? 'text-amber-900/80' : 'text-emerald-900/80'}`}>
              {owes ? `The desk settles this when you check out${business.checkout_time ? ` by ${business.checkout_time}` : ''}: UPI, cash or card.` : 'Your room is paid. Anything you order to the room is added here.'}
            </p>
          </div>
          <p className="shrink-0 text-4xl text-neutral-950" style={serif}>{inr(folio.balance)}</p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white/70 px-3 py-2"><dt className="flex items-center gap-1.5 text-neutral-500"><Wallet className="h-3.5 w-3.5" aria-hidden /> Paid at the desk</dt><dd className="mt-0.5 font-mono text-sm font-semibold text-neutral-950">{inr(folio.advance_total)}</dd></div>
          <div className="rounded-xl bg-white/70 px-3 py-2"><dt className="flex items-center gap-1.5 text-neutral-500"><UtensilsCrossed className="h-3.5 w-3.5" aria-hidden /> Food &amp; drinks</dt><dd className="mt-0.5 font-mono text-sm font-semibold text-neutral-950">{inr(folio.dining_total)}</dd></div>
        </dl>
      </section>

      {invoice && <RoomInvoiceCard invoice={invoice} business={business} roomType={room.category?.name || null} />}

      <section className="rounded-[1.5rem] border border-neutral-200 bg-white p-5">
        <p className={heading}>Your stay · {plural(folio.nights, 'night')} so far</p>
        <ul className="mt-2 divide-y divide-neutral-100">
          {folio.lines.map((l) => (
            <li key={l.id} className={row}>
              <span><span className="block text-neutral-950">{l.name}</span>{l.notes && <span className="text-xs text-neutral-500">{l.notes}</span>}</span>
              <span className="font-mono text-neutral-800">{inr(l.price * l.qty)}</span>
            </li>
          ))}
          {paid && (
            <li className={row}>
              <span><span className="block font-medium text-emerald-800">Paid at the desk</span><span className="text-xs text-neutral-500">{folio.advance_total > folio.advance_paid ? `You paid ${inr(folio.advance_total)} in all; the rest covers the nights still to come` : 'Credited to your bill'}</span></span>
              <span className="font-mono text-emerald-800">−{inr(folio.advance_paid)}</span>
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-[1.5rem] border border-neutral-200 bg-white p-5">
        <p className={heading}>Food &amp; drinks to your room · {inr(folio.dining_total)}</p>
        {folio.orders.length === 0
          ? <p className="mt-2 text-sm text-neutral-500">Nothing ordered yet. Food and drinks are added here and paid at checkout.</p>
          : <div className="mt-1"><RoomOrdersList orders={folio.orders} /></div>}
      </section>
      <p className="px-1 text-center text-[11px] text-neutral-400">Your final invoice, with everything charged to the room, is issued at the desk when you check out.</p>
    </div>
  );
}
