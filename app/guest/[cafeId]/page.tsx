'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { GUEST_BRAND } from '@/lib/brand';

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  image_url?: string;
  is_available: boolean;
}

interface ItemOption {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

interface VenueInfo {
  id: string;
  name: string;
  slug?: string;
  categories?: string[];
}

export default function GuestVenueMenuPage() {
  const params = useParams<{ cafeId: string }>();
  const searchParams = useSearchParams();
  const rawCafeId = params?.cafeId || searchParams.get('cafe_id') || searchParams.get('venue') || '';
  const tableParam = searchParams.get('table') || 'T-01';

  const [venue, setVenue] = useState<VenueInfo | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [options, setOptions] = useState<ItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCatalog = async () => {
    if (!rawCafeId) {
      setErrorMessage('Missing cafe identifier in URL parameters.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/guest/catalog?cafe_id=${encodeURIComponent(rawCafeId)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error || `Venue not found (HTTP ${res.status})`);
        setItems([]);
        return;
      }

      setVenue(data.venue || { id: data.business_id, name: 'Venue Menu' });
      setItems(data.items || []);
      setOptions(data.options || []);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect to the venue server.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [rawCafeId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ['All', ...Array.from(set)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesQuery;
    });
  }, [items, selectedCategory, searchQuery]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white selection:bg-white selection:text-black">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-xl px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400">
              {GUEST_BRAND.name}
            </p>
            <h1 className="mt-0.5 font-serif text-xl sm:text-2xl font-light text-white">
              {venue?.name || decodeURIComponent(rawCafeId).replace(/-/g, ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 text-[11px] font-mono text-neutral-400">
              Table {tableParam}
            </span>
            <Link
              href={`/menu?cafe_id=${encodeURIComponent(rawCafeId)}&table=${encodeURIComponent(tableParam)}`}
              className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition-transform hover:scale-105 active:scale-95"
            >
              Order Now
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-xs font-mono uppercase tracking-widest text-neutral-400">
              Loading Venue Catalog...
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="mx-auto max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 text-center backdrop-blur-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-400">
              ✕
            </div>
            <h2 className="font-serif text-2xl font-light text-white">Menu Unavailable</h2>
            <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
              {errorMessage}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={fetchCatalog}
                className="w-full rounded-xl bg-white px-4 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
              >
                Retry Loading
              </button>
              <Link
                href="/guest/lobby"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-400 transition hover:text-white"
              >
                Return to Lobby
              </Link>
            </div>
          </div>
        )}

        {/* Successful Content */}
        {!isLoading && !errorMessage && (
          <div>
            {/* Search and Filters */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search dishes, drinks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 px-4 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-neutral-600"
                />
              </div>

              {/* Categories Pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs transition ${
                      selectedCategory === cat
                        ? 'bg-white text-black font-semibold'
                        : 'border border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Empty Items State */}
            {filteredItems.length === 0 && (
              <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 p-12 text-center">
                <p className="font-serif text-lg text-neutral-300">No dishes currently listed</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {searchQuery ? 'Try clearing your search query' : 'Check back with the server shortly'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 text-xs underline text-neutral-400 hover:text-white"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}

            {/* Items Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-5 transition hover:border-neutral-700 hover:bg-neutral-900/70"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                          {item.category || 'Culinary'}
                        </span>
                        <h3 className="mt-1 font-serif text-lg font-light text-white group-hover:text-amber-100 transition-colors">
                          {item.name}
                        </h3>
                      </div>
                      <span className="font-mono text-sm font-semibold text-white">
                        ₹{item.price}
                      </span>
                    </div>

                    {item.description && (
                      <p className="mt-2 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-neutral-800/60 pt-4">
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Available
                    </span>
                    <Link
                      href={`/menu?cafe_id=${encodeURIComponent(rawCafeId)}&table=${encodeURIComponent(tableParam)}`}
                      className="rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-white hover:text-black"
                    >
                      Add +
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Item Options / Addons Summary if present */}
            {options.length > 0 && (
              <div className="mt-12 rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-6">
                <h4 className="text-xs font-mono uppercase tracking-widest text-neutral-400">
                  Customization Add-ons
                </h4>
                <div className="mt-4 flex flex-wrap gap-2">
                  {options.map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300"
                    >
                      <span>{opt.name}</span>
                      <span className="font-mono text-neutral-500">+₹{opt.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
