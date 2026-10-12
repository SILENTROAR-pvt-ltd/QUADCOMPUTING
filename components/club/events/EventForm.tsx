'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Label, Notice, field } from '../ui';
import { clubFetch } from '../api';
import { PhotoUploader } from '../PhotoUploader';
import { LineEditor } from './LineEditor';
import { EMPTY_EVENT, toPayload, type EventForm as Form } from './event-form';

const area = `${field} min-h-20`;

/** Create or edit a plan. Saving keeps it a draft; submitting (with consent) happens on the plan page. */
export function EventForm({ initial, eventId }: { initial?: Form; eventId?: string }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(initial ?? EMPTY_EVENT);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));
  const text = (k: keyof Form) => ({ value: f[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set({ [k]: e.target.value } as Partial<Form>) });
  const percent = f.schedule.reduce((s, l) => s + (Number(l.value) || 0), 0);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await clubFetch(eventId ? `/events/${eventId}` : '/events', { method: eventId ? 'PATCH' : 'POST', body: toPayload(f) });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/club/events/${res.data.event.id}`);
  };

  return (
    <form onSubmit={save} className="space-y-5" noValidate>
      <Card className="space-y-4">
        <Label text="Title"><input className={field} maxLength={120} placeholder="Sunset tour of North Goa" {...text('title')} /></Label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Label text="Type">
            <select className={field} value={f.kind} onChange={(e) => set({ kind: e.target.value as Form['kind'] })}>
              <option value="tour">Trip</option><option value="event">Ticketed event</option>{f.kind === 'short_plan' && <option value="short_plan">Short plan (older)</option>}
            </select>
          </Label>
          <Label text="Starts"><input type="datetime-local" className={field} {...text('starts_at')} /></Label>
          <Label text="Ends"><input type="datetime-local" className={field} {...text('ends_at')} /></Label>
        </div>
        <Label text="Cover gallery" hint="up to 8 photos"><PhotoUploader kind="events" photos={f.covers} onChange={(covers) => set({ covers })} /></Label>
      </Card>

      <Card className="space-y-4">
        <Label text="Venue or meeting point"><input className={field} maxLength={300} {...text('venue')} /></Label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Label text="Transport"><textarea className={area} maxLength={1000} {...text('transport')} /></Label>
          <Label text="Food"><textarea className={area} maxLength={1000} {...text('food')} /></Label>
          <Label text="Activities"><textarea className={area} maxLength={1000} {...text('activities')} /></Label>
        </div>
        <Label text="Cancellation policy"><textarea className={area} maxLength={2000} placeholder="Full refund until…, 50% until…" {...text('cancellation_policy')} /></Label>
        <Label text="Safety protocol"><textarea className={area} maxLength={2000} placeholder="Emergency contacts, first aid, group rules…" {...text('safety_protocol')} /></Label>
      </Card>

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <Label text="Stay budget from" hint="₹/night"><input className={field} inputMode="decimal" {...text('price_min')} /></Label>
          <Label text="Stay budget up to" hint="₹/night"><input className={field} inputMode="decimal" {...text('price_max')} /></Label>
          <Label text="Spots"><input className={field} inputMode="numeric" {...text('capacity')} /></Label>
          <Label text="Price per person" hint="₹, 0 = free"><input className={field} inputMode="decimal" {...text('ticket_price')} /></Label>
        </div>
        <Label text="Budget breakdown" hint="shown to participants"><LineEditor unit="₹" labelHint="Item" lines={f.budget} onChange={(budget) => set({ budget })} /></Label>
        <Label text="Payment schedule" hint={`must add up to 100% · now ${percent}%`}><LineEditor unit="%" labelHint="Step" max={6} lines={f.schedule} onChange={(schedule) => set({ schedule })} /></Label>
      </Card>

      <Notice>{error}</Notice>
      <div className="flex justify-end gap-2">
        <Button type="button" tone="quiet" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" busy={busy}>{eventId ? 'Save changes' : 'Save draft'}</Button>
      </div>
    </form>
  );
}
