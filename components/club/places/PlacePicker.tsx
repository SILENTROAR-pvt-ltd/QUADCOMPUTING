'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { FOCUS, Label, field } from '../ui';
import { clubFetch } from '../api';
import type { Place, PlaceRef } from './types';

/**
 * Pick a place from the list (search, then tap). A story or post can only be tagged with a listed
 * place, so the name on it always matches the place page it links to.
 */
export function PlacePicker({ value, onChange, label = 'Place', placeholder = 'Search for a place' }: { value: PlaceRef | null; onChange: (p: PlaceRef | null) => void; label?: string; placeholder?: string }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);

  useEffect(() => {
    if (value) return;
    const t = setTimeout(() => {
      void clubFetch<{ places: Place[] }>(`/places?sort=trending&q=${encodeURIComponent(q.trim())}`).then((r) => {
        if (r.ok) setResults(r.data.places.slice(0, q.trim() ? 20 : 8));
      });
    }, 200);
    return () => clearTimeout(t);
  }, [q, value]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[#e1efe3] px-4 py-3">
        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-[#2f5d1f]" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{value.name}{value.country ? <span className="font-normal text-[#14261b]/65"> · {value.country}</span> : null}</p>
        <button type="button" onClick={() => onChange(null)} aria-label="Remove place" className={`grid h-8 w-8 place-items-center rounded-full text-[#14261b]/60 hover:bg-white ${FOCUS}`}><X aria-hidden="true" className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <Label text={label} hint="optional">
      <input className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Search places" />
      <ul className="mt-2 max-h-56 divide-y divide-[#14261b]/[0.06] overflow-y-auto rounded-2xl bg-white ring-1 ring-[#14261b]/[0.06]">
        {results?.length === 0 && <li className="px-4 py-3 text-sm text-[#14261b]/60">No place matches. Try another name.</li>}
        {results?.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onChange({ id: p.id, name: p.name, region: p.region, country: p.country })}
              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#f2f0e8] ${FOCUS}`}>
              <span className="min-w-0 truncate"><span className="font-semibold">{p.name}</span> <span className="text-[#14261b]/55">{p.country}</span></span>
              {p.planning && <span className="shrink-0 text-[11px] font-semibold text-[#3c6b2b]">Planning</span>}
            </button>
          </li>
        ))}
      </ul>
    </Label>
  );
}
