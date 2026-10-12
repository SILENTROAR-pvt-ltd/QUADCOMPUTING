'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LocateFixed } from 'lucide-react';
import { Button, Card, Label, Notice, field } from '../ui';
import { clubFetch } from '../api';
import { PhotoUploader } from '../PhotoUploader';
import { RateRange } from './RateRange';
import { AMENITY_LABEL, EMPTY_PROPERTY, toPropertyPayload, type PropertyForm as Form } from './property-form';

const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? 'border-[#17301f] bg-[#c8da4a] text-[#14261b]' : 'border-[#14261b]/15 bg-[#14261b]/[0.04] text-[#14261b]/85 hover:bg-[#14261b]/[0.08]'}`;

/** List or edit a property. Saving sends it to staff for verification before it appears in search. */
export function PropertyForm({ initial, propertyId }: { initial?: Form; propertyId?: string }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(initial ?? EMPTY_PROPERTY);
  const [categories, setCategories] = useState<Array<{ slug: string; label: string }>>([]);
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));
  const text = (k: keyof Form) => ({ value: f[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set({ [k]: e.target.value } as Partial<Form>) });
  const toggle = (k: 'categories' | 'amenities', v: string) => set({ [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] } as Partial<Form>);

  useEffect(() => {
    void clubFetch('/categories').then((r) => r.ok && setCategories(r.data.categories));
    void clubFetch('/properties/mine').then((r) => r.ok && setVenues(r.data.venues));
  }, []);

  const locate = () => navigator.geolocation?.getCurrentPosition((p) => set({ lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await clubFetch(propertyId ? `/properties/${propertyId}` : '/properties', { method: propertyId ? 'PATCH' : 'POST', body: toPropertyPayload(f) });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/club/properties/${res.data.property.id}`);
  };

  return (
    <form onSubmit={save} className="space-y-5" noValidate>
      <Card className="space-y-4">
        <Label text="Property name"><input className={field} maxLength={120} {...text('name')} /></Label>
        <fieldset><legend className="text-xs font-semibold text-[#14261b]/80">Categories</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">{categories.map((c) => <button key={c.slug} type="button" aria-pressed={f.categories.includes(c.slug)} className={chip(f.categories.includes(c.slug))} onClick={() => toggle('categories', c.slug)}>{c.label}</button>)}</div>
        </fieldset>
        <Label text="Description"><textarea className={`${field} min-h-24`} maxLength={2000} {...text('description')} /></Label>
        <Label text="Photos" hint="up to 12"><PhotoUploader kind="properties" max={12} photos={f.photos} onChange={(photos) => set({ photos })} /></Label>
      </Card>
      <Card className="grid gap-5 sm:grid-cols-2">
        <Label text="Group capacity" hint="guests"><input className={field} inputMode="numeric" {...text('capacity')} /></Label>
        <Label text="Nightly rate range"><RateRange min={f.price_min} max={f.price_max} onChange={(price_min, price_max) => set({ price_min, price_max })} /></Label>
        <fieldset className="sm:col-span-2"><legend className="text-xs font-semibold text-[#14261b]/80">Amenities</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">{Object.entries(AMENITY_LABEL).map(([k, v]) => <button key={k} type="button" aria-pressed={f.amenities.includes(k)} className={chip(f.amenities.includes(k))} onClick={() => toggle('amenities', k)}>{v}</button>)}</div>
        </fieldset>
      </Card>
      <Card className="space-y-4">
        <Label text="Address"><input className={field} maxLength={300} {...text('address')} /></Label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Label text="City"><input className={field} {...text('city')} /></Label>
          <Label text="State"><input className={field} {...text('state')} /></Label>
          <Label text="Country"><input className={field} {...text('country')} /></Label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Label text="Map pin" hint="latitude, longitude"><span className="flex gap-2"><input className={`${field} w-36`} placeholder="15.5527" {...text('lat')} /><input className={`${field} w-36`} placeholder="73.7517" {...text('lng')} /></span></Label>
          <Button type="button" tone="quiet" onClick={locate}><LocateFixed className="h-4 w-4" /> Use where I am</Button>
        </div>
        {venues.length > 0 && (
          <Label text="Linked Quad Computing venue" hint="optional; lets guests checked in there get verified-stay badges">
            <select className={field} value={f.business_id} onChange={(e) => set({ business_id: e.target.value })}>
              <option value="">Not linked</option>{venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Label>
        )}
        <Label text="House rules"><textarea className={`${field} min-h-20`} maxLength={2000} {...text('house_rules')} /></Label>
        <Label text="Terms"><textarea className={`${field} min-h-20`} maxLength={2000} {...text('terms')} /></Label>
      </Card>
      <Notice>{error}</Notice>
      <div className="flex justify-end gap-2"><Button type="button" tone="quiet" onClick={() => router.back()}>Cancel</Button><Button type="submit" busy={busy}>{propertyId ? 'Save and resubmit' : 'Submit for verification'}</Button></div>
    </form>
  );
}
