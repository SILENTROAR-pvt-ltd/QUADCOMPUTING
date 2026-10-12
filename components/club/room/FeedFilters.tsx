'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, Globe, Search } from 'lucide-react';
import { FOCUS } from '../ui';
import { REGION_LABEL } from '../api';
import { photoUrl, REGION_PHOTO } from '../photos';
import { REGIONS } from './types';
import type { FeedSort } from './usePosts';

interface Props {
  q: string; setQ: (v: string) => void;
  sort: FeedSort; setSort: (v: FeedSort) => void;
}

/**
 * Search, the feed order (New, Top, or Following only), and the regions as photo tiles. A region opens
 * its places, where you can search and filter them further.
 */
export function FeedFilters({ q, setQ, sort, setSort }: Props) {
  const tile = `relative h-36 w-28 shrink-0 overflow-hidden rounded-[22px] text-left transition hover:-translate-y-0.5 ${FOCUS}`;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#14261b]/45" />
          <input type="search" aria-label="Search posts" placeholder="Search posts, places…" value={q} onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-full border-0 bg-white py-3.5 pl-11 pr-4 text-[15px] text-[#14261b] shadow-[0_8px_24px_-18px_rgba(20,38,27,0.6)] ring-1 ring-[#14261b]/[0.06] placeholder:text-[#14261b]/40 focus:outline-none focus:ring-2 focus:ring-[#17301f]/30" />
        </span>
        <label className="relative">
          <span className="sr-only">Sort posts</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as FeedSort)}
            className={`h-[50px] appearance-none rounded-full bg-[#17301f] pl-5 pr-9 text-sm font-semibold text-[#f6f4ec] ${FOCUS}`}>
            <option value="new">New</option>
            <option value="top">Top</option>
            <option value="following">Following</option>
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c8da4a]" />
        </label>
      </div>
      <div role="group" aria-label="Regions" className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
        <span className="grid h-36 w-28 shrink-0 place-items-center rounded-[22px] bg-[#17301f] text-center text-sm font-semibold text-[#f6f4ec]">
          <span className="flex flex-col items-center gap-2"><Globe aria-hidden="true" className="h-7 w-7 text-[#c8da4a]" />Everywhere</span>
        </span>
        {REGIONS.map((r) => {
          const photo = REGION_PHOTO[r];
          return (
            <Link key={r} href={`/club/places?region=${r}`} className={tile} aria-label={`Places in ${REGION_LABEL[r]}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(photo.id, 320, 420)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute inset-x-2.5 bottom-2.5 text-white">
                <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-white/85">{REGION_LABEL[r]}</span>
                <span className="block text-sm font-semibold leading-tight">Explore</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
