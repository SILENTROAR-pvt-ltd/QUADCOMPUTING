'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { Button, Card, Notice } from '../ui';
import { clubFetch, rupees } from '../api';
import { payWithRazorpay } from '../pay';
import { useClub } from '../club-context';

/** For members: ask questions in the plan's room, take a spot, and pay on the plan's schedule. */
export function JoinPanel({ view, onChanged }: { view: any; onChanged: () => void }) {
  const { me } = useClub();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const { event, me: mine, roomId } = view;

  const act = async (action: 'interest' | 'reserve') => {
    setBusy(action);
    setError('');
    const res = await clubFetch(`/events/${event.id}/action`, { body: { action } });
    setBusy('');
    if (!res.ok) return setError(res.error);
    onChanged();
  };

  const pay = async () => {
    setBusy('pay');
    setError('');
    const started = await clubFetch(`/events/${event.id}/action`, { body: { action: 'pay' } });
    if (!started.ok) { setBusy(''); return setError(started.error); }
    const result = await payWithRazorpay(started.data, { email: me.user?.email });
    setBusy('');
    if (!result.ok) setError(result.error || 'Payment not completed.');
    onChanged();
  };

  const p = mine.participant;
  return (
    <Card className="space-y-3">
      <p className="text-2xl font-semibold">{event.ticket_price ? rupees(event.ticket_price) : 'Free'}<span className="text-sm font-normal text-[#2a1250]/55"> per person</span></p>
      <p className="text-xs text-[#2a1250]/55">{view.counts.going} of {event.capacity} spots taken · {view.counts.interested} interested</p>
      {p && p.status !== 'cancelled' ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />{p.status === 'confirmed' ? 'You are going' : 'Spot reserved'}</p>
          {p.total_due > 0 && <p className="text-xs text-[#2a1250]/60">Paid {rupees(p.paid)} of {rupees(p.total_due)}</p>}
          {mine.next && <Button tone="aura" className="w-full" busy={busy === 'pay'} onClick={pay}>Pay {mine.next.label} · {rupees(mine.next.amount)}</Button>}
        </div>
      ) : (
        <Button tone="aura" className="w-full" busy={busy === 'reserve'} onClick={() => act('reserve')}>Reserve my spot</Button>
      )}
      {roomId
        ? <Link href={`/club/chat/${roomId}`} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#2a1250]/15 bg-white text-sm font-semibold"><MessageCircle className="h-4 w-4" /> Plan discussion</Link>
        : <Button tone="quiet" className="w-full" busy={busy === 'interest'} onClick={() => act('interest')}>I&apos;m interested: ask questions</Button>}
      <Notice>{error}</Notice>
    </Card>
  );
}
