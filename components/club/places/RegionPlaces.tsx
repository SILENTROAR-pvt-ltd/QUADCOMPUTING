'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Empty, FOCUS, Notice, Spinner } from '../ui';
import { Chip, Segmented } from '../ui-extra';
import { clubFetch, REGION_LABEL } from '../api';
import { CLUB_DISPLAY } from '../fonts';
import { PlaceCard } from './PlaceCard';
import { KIND_KEYS, KIND_LABEL, type Place } from './types';

const REGIONS = ['india', 'asia', 'europe', 'americas', 'africa', 'oceania'];

/**
 * Browse a region's places (India, Asia, ...): search, filter by kind, sort by what is happening now
 * or by name. Each card shows live stories, posts and how many people plan to go.
 */
export function RegionPlaces() {
  const router = useRouter();
  const region = useSearchParams()?.get('region') || 'india';
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [sort, setSort] = useState<'trending' | 'name'>('trending');
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setPlaces(null);
    const t = setTimeout(() => {
      const params = new URLSearchParams({ region, sort });
      if (q.trim()) params.set('q', q.trim());
      if (kind) params.set('kind', kind);
      void clubFetch<{ places: Place[] }>(`/places?${params}`).then((r) => {
        if (r.ok) { setPlaces(r.data.places); setError(''); } else { setPlaces([]); setError(r.error); }
      });
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [region, q, kind, sort]);

  const title = REGION_LABEL[region] ?? 'Places';
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#3c6b2b]">Select destination</p>
        <p className={`${CLUB_DISPLAY} mt-1 text-[34px] font-semibold leading-[1.05] tracking-tight sm:text-[44px]`}>Where in <em className="font-medium text-[#3c6b2b]">{title}</em>?</p>
      </div>

      <div role="group" aria-label="Region" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {REGIONS.map((r) => (
          <Chip key={r} active={r === region} onClick={() => router.replace(`/club/places?region=${r}`, { scroll: false })}>{REGION_LABEL[r]}</Chip>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#14261b]/45" />
          <input type="search" aria-label="Search places" placeholder={`Search ${title}: Goa, Manali, beaches…`} value={q} onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-full border-0 bg-white py-3.5 pl-11 pr-4 text-[15px] text-[#14261b] shadow-[0_8px_24px_-18px_rgba(20,38,27,0.6)] ring-1 ring-[#14261b]/[0.06] placeholder:text-[#14261b]/40 focus:outline-none focus:ring-2 focus:ring-[#17301f]/30" />
        </span>
        <Segmented label="Sort places" value={sort} options={[['trending', 'Trending'], ['name', 'A–Z']]} onChange={setSort} />
      </div>

      <div role="group" aria-label="Kind of place" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Chip active={!kind} onClick={() => setKind('')}>All</Chip>
        {KIND_KEYS.map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</Chip>)}
      </div>

      <Notice>{error}</Notice>
      {!places && !error && <Spinner />}
      {places?.length === 0 && !error && (
        <Empty title="No places match">Try another word or kind of place. <Link href="/club/places?region=india" className={`font-semibold text-[#3c6b2b] underline ${FOCUS}`}>Back to India</Link></Empty>
      )}
      {places && places.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {places.map((p) => <PlaceCard key={p.id} place={p} />)}
        </div>
      )}
    </div>
  );
}
