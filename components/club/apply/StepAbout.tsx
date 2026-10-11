'use client';

import React, { useEffect, useState } from 'react';
import { Label, field } from '../ui';
import { clubFetch } from '../api';
import { CITIES, COUNTRIES, INDIAN_STATES } from './places';
import type { ApplyForm } from './apply-form';

/** The latest birth date that is 18 today, as YYYY-MM-DD. */
export function adultCutoff(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

export function StepAbout({ form, set }: { form: ApplyForm; set: (patch: Partial<ApplyForm>) => void }) {
  const [categories, setCategories] = useState<Array<{ slug: string; label: string }>>([]);
  useEffect(() => {
    void clubFetch('/categories').then((r) => r.ok && setCategories(r.data.categories));
  }, []);
  const toggle = (slug: string) => set({ categories: form.categories.includes(slug) ? form.categories.filter((c) => c !== slug) : [...form.categories, slug] });

  return (
    <div className="space-y-4">
      <Label text="Date of birth" hint="never shown; we show your generation">
        <input className={field} type="date" max={adultCutoff()} min="1920-01-01" value={form.dob} onChange={(e) => set({ dob: e.target.value })} />
      </Label>
      <div className="grid gap-4 sm:grid-cols-3">
        <Label text="City"><input className={field} list="club-cities" value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder="Search or type" /></Label>
        <Label text="State"><input className={field} list="club-states" value={form.state} onChange={(e) => set({ state: e.target.value })} placeholder="Search or type" /></Label>
        <Label text="Country"><input className={field} list="club-countries" value={form.country} onChange={(e) => set({ country: e.target.value })} /></Label>
      </div>
      <datalist id="club-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="club-states">{INDIAN_STATES.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="club-countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>

      <fieldset>
        <legend className="text-xs font-semibold text-[#2a1250]/80">I am joining as</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(['viber', 'business'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={form.account_type === t} onClick={() => set({ account_type: t })}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${form.account_type === t ? 'border-[#7c3aed] bg-[#7c3aed] text-white' : 'border-[#2a1250]/15 bg-white'}`}>
              <span className="block font-semibold">{t === 'viber' ? 'A Viber' : 'A business'}</span>
              <span className="block text-xs opacity-70">{t === 'viber' ? 'Travel, meet, host plans' : 'Hotel, cafe or restaurant'}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {form.account_type === 'business' && (
        <div className="space-y-4 rounded-2xl bg-[#f3ebff]/50 p-4">
          <Label text="Business name"><input className={field} value={form.business_name} onChange={(e) => set({ business_name: e.target.value })} /></Label>
          <fieldset>
            <legend className="text-xs font-semibold text-[#2a1250]/80">Categories <span className="font-normal text-[#2a1250]/45">· choose all that apply</span></legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.slug} type="button" aria-pressed={form.categories.includes(c.slug)} onClick={() => toggle(c.slug)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${form.categories.includes(c.slug) ? 'border-[#7c3aed] bg-[#7c3aed] text-white' : 'border-[#2a1250]/15 bg-white'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}
