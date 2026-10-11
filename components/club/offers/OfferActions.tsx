'use client';

import React, { useState } from 'react';
import { Button, Card, Label, Notice, field } from '../ui';
import { clubFetch } from '../api';
import { useClub } from '../club-context';
import { LineEditor, type Line } from '../events/LineEditor';

const rupeesOf = (paise: number) => String(paise / 100);

/** Accept, counter, reject or withdraw, when it is this person's turn. */
export function OfferActions({ offer, role, onChanged }: { offer: any; role: string; onChanged: () => void }) {
  const { me } = useClub();
  const [countering, setCountering] = useState(false);
  const [terms, setTerms] = useState({ rate: rupeesOf(offer.rate), guests: String(offer.guests), check_in: offer.check_in, check_out: offer.check_out, note: '' });
  const [addOns, setAddOns] = useState<Line[]>((offer.add_ons || []).map((a: any) => ({ label: a.label, value: rupeesOf(a.amount) })));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const live = offer.status === 'open' || offer.status === 'countered';
  if (!live || role === 'staff') return null;
  const myTurn = offer.last_actor !== me.user?.id;

  const act = async (action: 'accept' | 'reject' | 'withdraw' | 'counter') => {
    if (action !== 'counter' && !window.confirm(action === 'accept' ? 'Accept these terms? The rate will be locked into an invoice.' : `Really ${action} this offer?`)) return;
    setBusy(action);
    setError('');
    const body: Record<string, unknown> = { action, version: offer.version, note: terms.note };
    if (action === 'counter') Object.assign(body, terms, { add_ons: addOns.filter((a) => a.label.trim()).map((a) => ({ label: a.label, amount: a.value })) });
    const res = await clubFetch(`/offers/${offer.id}`, { body });
    setBusy('');
    if (!res.ok) return setError(res.error);
    setCountering(false);
    onChanged();
  };
  const t = (k: keyof typeof terms) => ({ value: terms[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTerms((x) => ({ ...x, [k]: e.target.value })) });

  return (
    <Card className="space-y-4">
      {!myTurn && <Notice tone="info">Waiting for the other side to respond.</Notice>}
      {myTurn && !countering && (
        <div className="flex flex-wrap gap-2">
          <Button tone="aura" busy={busy === 'accept'} onClick={() => act('accept')}>Accept terms</Button>
          <Button tone="quiet" onClick={() => setCountering(true)}>Counter</Button>
          <Button tone="danger" busy={busy === 'reject'} onClick={() => act('reject')}>Reject</Button>
        </div>
      )}
      {countering && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Label text="Stay total" hint="₹"><input className={field} inputMode="decimal" {...t('rate')} /></Label>
            <Label text="Guests"><input className={field} inputMode="numeric" {...t('guests')} /></Label>
            <Label text="Check-in"><input type="date" className={field} {...t('check_in')} /></Label>
            <Label text="Check-out"><input type="date" className={field} {...t('check_out')} /></Label>
          </div>
          <Label text="Add-ons"><LineEditor unit="₹" labelHint="Add-on" max={10} lines={addOns} onChange={setAddOns} /></Label>
          <Label text="Note"><textarea className={`${field} min-h-16`} maxLength={1000} {...t('note')} /></Label>
          <div className="flex gap-2"><Button busy={busy === 'counter'} onClick={() => act('counter')}>Send counter-offer</Button><Button tone="quiet" onClick={() => setCountering(false)}>Cancel</Button></div>
        </div>
      )}
      {role === 'creator' && <button type="button" onClick={() => act('withdraw')} className="text-xs font-semibold text-[#2a1250]/55 underline">Withdraw this offer</button>}
      <Notice>{error}</Notice>
    </Card>
  );
}
