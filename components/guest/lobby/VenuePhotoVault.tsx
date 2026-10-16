// components/guest/lobby/VenuePhotoVault.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { VaultPhoto } from './vault.constants';
import { VaultPhotoCard } from './VaultPhotoCard';
import { VaultLightboxModal } from './VaultLightboxModal';
import { useVenuePhotos } from './useVenuePhotos';

interface VenuePhotoVaultProps {
  venueId?: string;
  /** "rail" is one swipeable row (for the menu); "grid" is the lounge's full grid. Both share the menu's light look. */
  layout?: 'grid' | 'rail';
  /** Draws nothing until the venue has shared something, instead of an empty-state card. */
  hideWhenEmpty?: boolean;
  /** The guest's table, so a "Request this" on a moment reaches the team with the table. */
  tableNumber?: string;
}

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

/** The venue's moments (photos and events the host shares), in the same ivory theme on the menu and in the lounge. */
export function VenuePhotoVault({ venueId = '', layout = 'grid', hideWhenEmpty = false, tableNumber }: VenuePhotoVaultProps) {
  const { photos, loading, refreshing, refresh } = useVenuePhotos(venueId);
  const [selected, setSelected] = useState<VaultPhoto | null>(null);
  const [category, setCategory] = useState('All');

  // Categories come only from this venue's own photos.
  const categories = useMemo(() => ['All', ...Array.from(new Set(photos.map((p) => p.category).filter(Boolean)))], [photos]);
  const shown = useMemo(
    () => (category === 'All' ? photos : photos.filter((p) => p.category?.toLowerCase() === category.toLowerCase())),
    [photos, category],
  );

  if (hideWhenEmpty && (loading || photos.length === 0)) return null;
  const rail = layout === 'rail';

  return (
    <section aria-label="Moments from the venue" className={rail ? 'space-y-3.5 border-t border-zinc-200/80 pt-8' : 'space-y-3.5'}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 px-0.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-400">From the venue</p>
            <h2 className="mt-1 text-[21px] leading-tight text-zinc-950" style={SERIF}>Moments</h2>
            <p className="mt-1.5 text-[12px] leading-snug text-zinc-500">Photos and events shared by the venue.</p>
          </div>
          {!rail && (
            <button type="button" onClick={() => void refresh()} disabled={refreshing} aria-label="Refresh moments"
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-zinc-200/70 bg-white text-zinc-500 active:scale-95">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        {categories.length > 2 && (
          <div role="group" aria-label="Moments categories" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
            {categories.map((cat) => (
              <button key={cat} type="button" aria-pressed={category === cat} onClick={() => setCategory(cat)}
                className={`h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3.5 text-xs font-medium transition-colors active:scale-95 ${
                  category === cat ? 'bg-[#0A3222] text-white shadow-[0_6px_16px_-8px_rgba(10,50,34,0.8)]' : 'border border-zinc-200/70 bg-white text-zinc-600 hover:text-zinc-900'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[1, 2].map((n) => <div key={n} className="shimmer h-64 rounded-2xl" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-neutral-200/80 bg-white px-6 py-12 text-center">
          <p className="text-lg text-zinc-950" style={SERIF}>{category === 'All' ? 'Nothing shared yet' : `Nothing in â€œ${category}â€`}</p>
          <p className="text-xs text-zinc-500">{category === 'All' ? 'When the venue shares photos or events, they show up here.' : 'Try another category.'}</p>
          {category !== 'All' && (
            <button type="button" onClick={() => setCategory('All')} className="mt-2 cursor-pointer rounded-full bg-[#0A3222] px-4 py-1.5 text-xs font-medium text-white">Show everything</button>
          )}
        </div>
      ) : rail ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
          {shown.map((p) => <div key={p.id} className="w-[78%] max-w-[320px] shrink-0 snap-start"><VaultPhotoCard item={p} onSelect={setSelected} /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => <VaultPhotoCard key={p.id} item={p} onSelect={setSelected} />)}
        </div>
      )}

      <VaultLightboxModal selectedItem={selected} onClose={() => setSelected(null)} venueId={venueId} tableNumber={tableNumber} />
    </section>
  );
}

export default VenuePhotoVault;
