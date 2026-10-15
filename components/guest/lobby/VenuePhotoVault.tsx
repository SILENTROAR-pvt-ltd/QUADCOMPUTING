// components/guest/lobby/VenuePhotoVault.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { VaultPhoto } from './vault.constants';
import { VaultPhotoCard } from './VaultPhotoCard';
import { VaultLightboxModal } from './VaultLightboxModal';
import { createClient } from '@/lib/supabase/client';

interface VenuePhotoVaultProps {
  venueId?: string;
  /** "rail" is one swipeable row (for the menu); "grid" is the lounge's full grid. */
  layout?: 'grid' | 'rail';
  /** Draws nothing until the venue has shared something, instead of an empty-state card. */
  hideWhenEmpty?: boolean;
  /** The guest's table, so a "Request this" on a moment reaches the team with the table. */
  tableNumber?: string;
}

export function VenuePhotoVault({
  venueId = '',
  layout = 'grid',
  hideWhenEmpty = false,
  tableNumber,
}: VenuePhotoVaultProps) {
  // Starts empty: a venue shows only its own vault. Seeding from a shared demo
  // constant made every brand-new venue display another venue's curated content.
  const [photos, setPhotos] = useState<VaultPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<VaultPhoto | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchPhotos = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    
    try {
      // 1. Attempt direct Supabase query
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('venue_photo_vault')
          .select('*')
          .eq('venue_id', venueId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: VaultPhoto[] = data.map((row: any) => ({
            id: row.id,
            venue_id: row.venue_id,
            title: row.title,
            category: row.category,
            timeTag: row.time_tag || '',
            time_tag: row.time_tag || '',
            date: row.time_tag ? row.time_tag.split('@')[0]?.trim() : 'Live Event',
            time: row.time_tag ? row.time_tag.split('@')[1]?.trim() || '' : '',
            imageUrl: row.image_url,
            image_url: row.image_url,
            description: row.description || '',
            created_at: row.created_at,
          }));
          setPhotos(mapped);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      }
    } catch (err) {
      console.warn('[VenuePhotoVault] Supabase direct query note:', err);
    }

    // 2. Fallback to API route
    try {
      const res = await fetch(`/api/venue/photo-vault?venue_id=${encodeURIComponent(venueId)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.photos && json.photos.length > 0) {
          setPhotos(json.photos);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      }
    } catch (err) {
      console.warn('[VenuePhotoVault] API fetch note:', err);
    }

    // No rows for this venue is a legitimate empty state, not a reason to show
    // someone else's photos.
    setPhotos([]);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [venueId]);

  useEffect(() => {
    fetchPhotos();

    // Subscribe to realtime Postgres changes for live sync
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`venue_photo_vault_${venueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venue_photo_vault',
          filter: `venue_id=eq.${venueId}`,
        },
        () => {
          fetchPhotos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, fetchPhotos]);

  // Dynamically derive category pills from live items
  // Categories come only from this venue's own photos. A fixed default list
  // ("Acoustic Lounge", "Cocktail Specials", ...) made empty venues advertise
  // categories of content they don't have.
  const dynamicCategories = useMemo(() => {
    const photoCategories = photos.map((p) => p.category).filter(Boolean);
    return ['All', ...Array.from(new Set(photoCategories))];
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    if (activeCategory === 'All') return photos;
    return photos.filter((p) => p.category?.toLowerCase() === activeCategory.toLowerCase());
  }, [photos, activeCategory]);

  if (hideWhenEmpty && (isLoading || photos.length === 0)) return null;

  const rail = layout === 'rail';

  return (
    <section
      aria-label="Moments from the venue"
      className={rail ? 'space-y-3.5 border-t border-zinc-200/80 pt-8' : 'space-y-5 sm:space-y-6'}
    >
      {/* On the menu the header follows the other sections: a small label, a serif title, one quiet line, and category pills in the menu's own style. */}
      {rail && (
        <div className="space-y-3">
          <div className="px-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-400">From the venue</p>
            <h2 className="mt-1 text-[21px] leading-tight text-zinc-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Moments</h2>
            <p className="mt-1.5 text-[12px] leading-snug text-zinc-500">Photos and events shared by the venue.</p>
          </div>
          {dynamicCategories.length > 2 && (
            <div role="group" aria-label="Moments categories" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
              {dynamicCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={activeCategory === cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3.5 text-xs font-medium transition-colors active:scale-95 ${
                    activeCategory === cat
                      ? 'bg-[#0A3222] text-white shadow-[0_6px_16px_-8px_rgba(10,50,34,0.8)]'
                      : 'border border-zinc-200/70 bg-white text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section Header (the lounge's) */}
      {!rail && (
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-neutral-400">
              From the venue
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 tracking-tight flex items-center gap-3">
            <span>Moments</span>
            <button
              type="button"
              onClick={() => fetchPhotos(true)}
              disabled={isRefreshing}
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Refresh venue vault"
              aria-label="Refresh venue vault"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-neutral-800' : ''}`} />
            </button>
          </h2>
          <p className="text-xs text-neutral-500 font-normal max-w-lg leading-relaxed mt-1">
            Photos and events shared by the venue.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {dynamicCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Loading Skeleton or Responsive Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900/10 min-h-[300px] flex flex-col"
            >
              <div className="aspect-[4/3] bg-neutral-200" />
              <div className="p-4 space-y-2 flex-1">
                <div className="h-3 w-20 bg-neutral-200 rounded" />
                <div className="h-5 w-48 bg-neutral-200 rounded" />
                <div className="h-3 w-full bg-neutral-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-14 text-center space-y-2">
          <p className="font-serif text-lg text-neutral-900">
            {activeCategory === 'All' ? 'Nothing shared yet' : `Nothing in “${activeCategory}”`}
          </p>
          <p className="text-xs text-neutral-500">
            {activeCategory === 'All' ? 'When the venue shares photos or events, they show up here.' : 'Try another category.'}
          </p>
          {activeCategory !== 'All' && (
            <button
              type="button"
              onClick={() => setActiveCategory('All')}
              className="mt-3 px-4 py-1.5 rounded-full text-xs font-medium bg-neutral-900 text-white cursor-pointer"
            >
              Show everything
            </button>
          )}
        </div>
      ) : layout === 'rail' ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="w-[78%] max-w-[320px] shrink-0 snap-start">
              <VaultPhotoCard item={photo} onSelect={setSelectedPhoto} variant="light" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredPhotos.map((photo) => (
            <VaultPhotoCard
              key={photo.id}
              item={photo}
              onSelect={setSelectedPhoto}
            />
          ))}
        </div>
      )}

      {/* Full-Screen Lightbox Modal */}
      <VaultLightboxModal
        selectedItem={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        variant={rail ? 'light' : 'dark'}
        venueId={venueId}
        tableNumber={tableNumber}
      />
    </section>
  );
}

export default VenuePhotoVault;
