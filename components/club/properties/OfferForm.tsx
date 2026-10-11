'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Label, Notice, field } from '../ui';
import { clubFetch } from '../api';
import { LineEditor, type Line } from '../events/LineEditor';

/** A group offer from one of the member's approved plans to this property. */
export function OfferForm({ propertyId, preselect }: { propertyId: string; preselect: string | null }) {
  const router = useRouter();
  const [plans, setPlans] = useState<any[] | null>(null);
  const [eventId, setEventId] = useState(preselect || '');
  const [terms, setTerms] = useState({ rate: '', guests: '', check_in: '', check_out: '', note: '' });
  const [addOns, setAddOns] = useState<Line[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void clubFetch('/events?mine=1').then((r) => r.ok && setPlans(r.data.events.filter((e: any) => e.status === 'approved')));
  }, []);
  if (!plans || plans.length === 0) return null;
  const t = (k: keyof typeof terms) => ({ value: terms[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTerms((x) => ({ ...x, [k]: e.target.value })) });

  const send = async () => {
    setBusy(true);
    setError('');
    const res = await clubFetch('/offers', {
      body: { event_id: eventId, property_id: propertyId, ...terms, add_ons: addOns.filter((a) => a.label.trim()).map((a) => ({ label: a.label, amount: a.value })) },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/club/offers/${res.data.offer.id}`);
  };

  return (
    <Card className="space-y-4">
      <p className="font-semibold">Make a group offer</p>
      <Label text="For plan">
        <select className={field} value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">Choose a plan</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </Label>
      <div className="grid grid-cols-2 gap-3">
        <Label text="Total for the stay" hint="₹"><input className={field} inputMode="decimal" {...t('rate')} /></Label>
        <Label text="Guests"><input className={field} inputMode="numeric" {...t('guests')} /></Label>
        <Label text="Check-in"><input type="date" className={field} {...t('check_in')} /></Label>
        <Label text="Check-out"><input type="date" className={field} {...t('check_out')} /></Label>
      </div>
      <Label text="Add-ons" hint="bonfire, meals, transfers…"><LineEditor unit="₹" labelHint="Add-on" max={10} lines={addOns} onChange={setAddOns} /></Label>
      <Label text="Note to the owner"><textarea className={`${field} min-h-20`} maxLength={1000} {...t('note')} /></Label>
      <Notice>{error}</Notice>
      <Button tone="aura" busy={busy} disabled={!eventId} onClick={send}>Send offer</Button>
    </Card>
  );
}
