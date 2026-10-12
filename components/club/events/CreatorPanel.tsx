'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Pencil } from 'lucide-react';
import { Button, Card, Notice } from '../ui';
import { clubFetch } from '../api';
import { ConsentSubmit } from './ConsentSubmit';

/** What the plan's creator can do next, by status. */
export function CreatorPanel({ view, onChanged }: { view: any; onChanged: () => void }) {
  const router = useRouter();
  const { event } = view;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const act = async (action: 'complete' | 'noc') => {
    setBusy(action);
    setError('');
    const res = await clubFetch(`/events/${event.id}/action`, { body: { action } });
    setBusy('');
    if (!res.ok) return setError(res.error);
    if (action === 'noc') router.push(`/club/noc/${res.data.noc.code}`);
    else onChanged();
  };

  const edit = <Link href={`/club/events/${event.id}/edit`} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#14261b]/15 px-4 text-sm font-semibold hover:bg-[#14261b]/[0.06]"><Pencil className="h-4 w-4" /> Edit plan</Link>;
  const ended = Date.parse(event.ends_at) < Date.now();

  return (
    <div className="space-y-4">
      {event.status === 'draft' && <>{edit}{view.consent && <ConsentSubmit eventId={event.id} consent={view.consent} onDone={onChanged} />}</>}
      {event.status === 'submitted' && <Notice tone="info">Your plan is with the Vibers Club team for review. You will be notified here.</Notice>}
      {event.status === 'rejected' && (
        <Card className="space-y-3">
          <p className="font-semibold">Changes requested</p>
          <p className="rounded-2xl bg-[#14261b]/[0.05] p-3 text-sm text-[#14261b]/85">{event.review_note}</p>
          {edit}
        </Card>
      )}
      {event.status === 'approved' && (
        <Card className="flex flex-wrap gap-2">
          {view.roomId && <Link href={`/club/chat/${view.roomId}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#c8da4a] px-4 text-sm font-semibold text-[#14261b] hover:bg-[#bccf3b]"><MessageCircle className="h-4 w-4" /> Plan discussion</Link>}
          <Button tone="quiet" busy={busy === 'complete'} disabled={!ended} onClick={() => act('complete')} title={ended ? undefined : 'Available once the plan has ended'}>Mark completed</Button>
        </Card>
      )}
      {event.status === 'completed' && (
        <Card className="space-y-2">
          <p className="font-semibold">Plan completed</p>
          <p className="text-sm text-[#14261b]/70">Once every payout is done and the escrow is at zero, issue the No Objection Certificate.</p>
          <Button tone="aura" busy={busy === 'noc'} onClick={() => act('noc')}>{view.nocCode ? 'Open the NOC' : 'Issue the NOC'}</Button>
        </Card>
      )}
      <Notice>{error}</Notice>
    </div>
  );
}
