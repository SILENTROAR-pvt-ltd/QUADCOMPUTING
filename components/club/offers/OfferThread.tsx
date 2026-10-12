'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Card, Notice, Spinner } from '../ui';
import { clubFetch, rupees, shortDate } from '../api';
import { OfferActions } from './OfferActions';

const VERB: Record<string, string> = { offer: 'offered', counter: 'countered', accept: 'accepted', reject: 'rejected', withdraw: 'withdrew' };

/** The negotiation between a plan's creator and a property owner, newest terms on top. */
export function OfferThread({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const r = await clubFetch(`/offers/${id}`);
    if (r.ok) setData(r.data); else setError(r.error);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  if (error) return <Notice>{error}</Notice>;
  if (!data) return <Spinner />;
  const { offer, thread, agreement, people, event, property, role } = data;
  const nameOf = (uid: string) => people.find((p: any) => p.user_id === uid)?.name ?? (uid === offer.owner_id ? 'Owner' : 'Creator');
  const addOnTotal = (offer.add_ons || []).reduce((s: number, a: any) => s + a.amount, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3c6b2b]">Group deal</p>
        <h2 className="mt-1 text-[28px] font-bold leading-tight tracking-tight">{property.name} <span className="text-[#3c6b2b]">×</span> <Link href={`/club/events/${event.id}`} className="underline-offset-4 hover:underline">{event.title}</Link></h2>
        <div className="mt-2 flex items-center gap-2"><Badge tone={offer.status === 'accepted' ? 'good' : offer.status === 'rejected' || offer.status === 'withdrawn' ? 'bad' : 'warn'}>{offer.status}</Badge><span className="text-xs text-[#14261b]/65">You are the {role}</span></div>
      </div>
      <Card className="grid gap-3 sm:grid-cols-4">
        <div><p className="text-xs text-[#14261b]/65">Stay total</p><p className="font-semibold">{rupees(offer.rate)}</p></div>
        <div><p className="text-xs text-[#14261b]/65">Guests</p><p className="font-semibold">{offer.guests}</p></div>
        <div><p className="text-xs text-[#14261b]/65">Dates</p><p className="font-semibold">{offer.check_in} → {offer.check_out}</p></div>
        <div><p className="text-xs text-[#14261b]/65">With add-ons</p><p className="font-semibold">{rupees(offer.rate + addOnTotal)}</p></div>
        <p className="text-xs text-[#14261b]/60 sm:col-span-4">Listed rate {rupees(property.price_min)} – {rupees(property.price_max)} per night</p>
      </Card>
      {agreement && (
        <Notice tone="good">
          Locked as invoice {agreement.invoice_number}: {rupees(agreement.total)}, deposit {rupees(agreement.deposit_amount)} ({agreement.status === 'deposit_paid' ? 'paid' : 'awaiting payment'}).{' '}
          {role === 'creator' && agreement.status !== 'deposit_paid' && <Link href={`/club/events/${event.id}`} className="font-semibold underline">Pay the deposit on the plan page</Link>}
        </Notice>
      )}
      <OfferActions offer={offer} role={role} onChanged={load} />
      <Card>
        <p className="mb-3 font-semibold">History</p>
        <ol className="space-y-3">
          {[...thread].reverse().map((r: any) => (
            <li key={r.id} className="border-l-2 border-[#14261b]/10 pl-3 text-sm">
              <p><span className="font-semibold">{nameOf(r.actor_id)}</span> {VERB[r.action]}{r.rate ? ` ${rupees(r.rate)} for ${r.guests} guests, ${r.check_in} → ${r.check_out}` : ''}<span className="text-xs text-[#14261b]/60"> · {shortDate(r.created_at)}</span></p>
              {r.add_ons?.length > 0 && <p className="text-xs text-[#14261b]/70">Add-ons: {r.add_ons.map((a: any) => `${a.label} ${rupees(a.amount)}`).join(', ')}</p>}
              {r.note && <p className="mt-1 rounded-xl bg-[#14261b]/[0.05] px-3 py-2 text-[#14261b]/80">{r.note}</p>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
