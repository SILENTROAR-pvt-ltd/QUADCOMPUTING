'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { CircleCheck, MessageCircle } from 'lucide-react';
import { Button, Card, Notice } from '../ui';
import { clubFetch, rupees } from '../api';
import { payWithRazorpay } from '../pay';
import { useClub } from '../club-context';

/** For members: ask questions in the plan's room, take a spot, and pay on the plan's schedule. */
export function JoinPanel({ view, onChanged }: { view: any; onChanged: () => void }) {
  const { me } = useClub();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const acting = useRef(false);
  const { event, me: mine, roomId } = view;

  const act = async (action: 'interest' | 'reserve') => {
    if (acting.current) return;
    acting.current = true;
    setBusy(action);
    setError('');
    const res = await clubFetch(`/events/${event.id}/action`, { body: { action } });
    acting.current = false;
    setBusy('');
    if (!res.ok) return setError(res.error);
    onChanged();
  };

  const pay = async () => {
    if (acting.current) return;
    acting.current = true;
    setBusy('pay');
    setError('');
    const started = await clubFetch(`/events/${event.id}/action`, { body: { action: 'pay' } });
    if (!started.ok) { acting.current = false; setBusy(''); return setError(started.error); }
    const result = await payWithRazorpay(started.data, { email: me.user?.email });
    acting.current = false;
    setBusy('');
    if (!result.ok) setError(result.error || 'Payment not completed.');
    onChanged();
  };

  const p = mine.participant;
  const left = Math.max(0, event.capacity - view.counts.going);
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-3xl font-bold">{event.ticket_price ? rupees(event.ticket_price) : 'Free'}<span className="text-sm font-normal text-[#14261b]/65"> per person</span></p>
        <p className="mt-1 text-sm"><span className="font-semibold text-[#3c6b2b]">{view.counts.going} going</span><span className="text-[#14261b]/65"> · {view.counts.interested} interested · {left} {left === 1 ? 'spot' : 'spots'} left</span></p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#14261b]/10"><div className="h-full rounded-full bg-[#c8da4a]" style={{ width: `${Math.min(100, (view.counts.going / Math.max(1, event.capacity)) * 100)}%` }} /></div>
      </div>
      {p && p.status !== 'cancelled' ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#3c6b2b]"><CircleCheck className="h-4 w-4" />{p.status === 'confirmed' ? 'You are going' : 'Spot reserved'}</p>
          {p.total_due > 0 && <p className="text-xs text-[#14261b]/70">Paid {rupees(p.paid)} of {rupees(p.total_due)}</p>}
          {mine.next && <Button tone="aura" className="w-full" busy={busy === 'pay'} onClick={pay}>Pay {mine.next.label} · {rupees(mine.next.amount)}</Button>}
        </div>
      ) : (
        <Button tone="aura" className="h-12 w-full" busy={busy === 'reserve'} disabled={left === 0} onClick={() => act('reserve')}>{left === 0 ? 'This plan is full' : 'Reserve my spot'}</Button>
      )}
      {roomId
        ? <Link href={`/club/chat/${roomId}`} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#14261b]/15 text-sm font-semibold hover:bg-[#14261b]/[0.06]"><MessageCircle className="h-4 w-4" /> Plan discussion</Link>
        : <Button tone="quiet" className="w-full" busy={busy === 'interest'} onClick={() => act('interest')}>I&apos;m interested: ask questions</Button>}
      <Notice>{error}</Notice>
    </Card>
  );
}
