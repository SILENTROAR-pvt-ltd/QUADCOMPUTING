'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Building2 } from 'lucide-react';
import { Badge, Button, Card, Notice } from '../ui';
import { clubFetch, rupees, shortDate } from '../api';
import { payWithRazorpay } from '../pay';
import { useClub } from '../club-context';

const OFFER_TONE: Record<string, 'neutral' | 'good' | 'warn' | 'bad'> = { open: 'warn', countered: 'warn', accepted: 'good', rejected: 'bad', withdrawn: 'neutral' };

/** The creator's property deals: live offers, locked agreements, and the deposit that verifies the plan. */
export function DealsPanel({ view, onChanged }: { view: any; onChanged: () => void }) {
  const { me } = useClub();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const deposit = async (agreementId: string) => {
    setBusy(agreementId);
    setError('');
    const started = await clubFetch(`/agreements/${agreementId}/deposit`, { body: {} });
    if (!started.ok) { setBusy(''); return setError(started.error); }
    const result = await payWithRazorpay(started.data, { email: me.user?.email });
    setBusy('');
    if (!result.ok) setError(result.error || 'Payment not completed.');
    onChanged();
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Stays & deals</p>
        {view.event.status === 'approved' && (
          <Link href={`/club/properties?event=${view.event.id}`} className="inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"><Building2 className="h-4 w-4" /> Find a stay</Link>
        )}
      </div>
      {view.agreements.map((a: any) => (
        <div key={a.id} className="rounded-2xl border border-[#14261b]/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Invoice {a.invoice_number}</p>
            {a.status === 'deposit_paid' ? <Badge tone="good"><BadgeCheck className="h-3 w-3" /> Deposit paid</Badge> : <Badge tone="warn">Awaiting deposit</Badge>}
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {a.items.map((it: any, i: number) => <li key={i} className="flex justify-between gap-3"><span className="text-[#14261b]/75">{it.label}</span><span>{rupees(it.amount)}</span></li>)}
            <li className="flex justify-between border-t border-[#14261b]/10 pt-1 font-semibold"><span>Total</span><span>{rupees(a.total)}</span></li>
          </ul>
          {a.status === 'awaiting_deposit' && view.me.isCreator && (
            <Button tone="aura" className="mt-3" busy={busy === a.id} onClick={() => deposit(a.id)}>Pay non-refundable deposit · {rupees(a.deposit_amount)}</Button>
          )}
        </div>
      ))}
      {view.offers.filter((o: any) => o.status !== 'accepted').map((o: any) => (
        <Link key={o.id} href={`/club/offers/${o.id}`} className="flex items-center justify-between gap-2 rounded-2xl bg-[#14261b]/[0.05] px-4 py-3 text-sm hover:bg-[#14261b]/[0.08]">
          <span>Offer {rupees(o.rate)} · {o.guests} guests · {o.check_in}</span>
          <span className="flex items-center gap-2"><Badge tone={OFFER_TONE[o.status]}>{o.status}</Badge><span className="text-xs text-[#14261b]/60">{shortDate(o.updated_at)}</span></span>
        </Link>
      ))}
      {view.agreements.length === 0 && view.offers.length === 0 && <p className="text-sm text-[#14261b]/65">No deals yet. Offers you make to verified properties appear here.</p>}
      <Notice>{error}</Notice>
    </Card>
  );
}
