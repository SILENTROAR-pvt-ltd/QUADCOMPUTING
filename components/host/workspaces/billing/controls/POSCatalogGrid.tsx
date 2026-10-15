'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { CatalogItem } from '@/types';
import { Search, Plus, X, Tag, Pencil, Check } from 'lucide-react';
import { CatalogTrie } from '@/lib/utils/catalog-trie.util';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { defaultGstRate } from '@/lib/utils/gst-rates';

export interface CatalogItemPayload {
  id: string;
  name: string;
  price: number;
  tax_rate: number;
  category: string;
  item_type?: string;
  description?: string;
  image_url?: string | null;
  is_available?: boolean;
  metadata?: Record<string, any>;
}

interface Props {
  cafeId?: string | null;
  activeItems?: CatalogItem[];
  cartItems?: Array<{ id: string; name: string; price: number; qty: number }>;
  onAddItemToCart?: (item: CatalogItemPayload) => void;
  addItem?: (id: string) => void;
}

export function POSCatalogGrid({
  cafeId,
  activeItems = [],
  cartItems = [],
  onAddItemToCart,
  addItem,
}: Props) {
  const offersAccommodation = useHostWorkspace((state) => state.profile?.offersAccommodation);

  const initialCatalog = useMemo(() => {
    return (activeItems || [])
      .filter(ai => offersAccommodation || (ai.kind !== 'accommodation' && ai.category !== 'Room Add-ons'))
      .map((ai) => ({
      id: ai.id,
      name: ai.name,
      price: ai.kind === 'accommodation' ? ai.nightlyRate.amountMinor : ai.price.amountMinor,
      tax_rate: defaultGstRate(ai),
      category: ai.kind === 'food_beverage' ? 'F&B' : (ai.kind === 'accommodation' ? 'Room Add-ons' : 'Services'),
      item_type: ai.kind === 'food_beverage' ? 'food' : (ai.kind === 'accommodation' ? 'room' : 'service'),
      description: ai.description || '',
    }));
  }, [activeItems, offersAccommodation]);

  const [catalog, setCatalog] = useState<CatalogItemPayload[]>(initialCatalog);
  const [categories, setCategories] = useState<string[]>(['All', 'F&B', 'Room Add-ons', 'Services']);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [priceEditorItem, setPriceEditorItem] = useState<CatalogItemPayload | null>(null);
  const [priceDraft, setPriceDraft] = useState('');
  const [priceError, setPriceError] = useState('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);


  useEffect(() => {
    let isMounted = true;

    async function fetchCatalog() {
      try {
        const catalogUrl = cafeId
          ? `/api/host/catalog?cafe_id=${encodeURIComponent(cafeId)}`
          : '/api/host/catalog';
        const res = await fetch(catalogUrl, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items)) {
            const availableItems = data.items.filter((item: CatalogItemPayload) => item.is_available !== false);
            if (isMounted) {
              const fallbackItems: CatalogItemPayload[] = (activeItems || []).map((ai) => ({
                id: ai.id,
                name: ai.name,
                price: ai.kind === 'accommodation' ? ai.nightlyRate.amountMinor : ai.price.amountMinor,
                tax_rate: defaultGstRate(ai),
                category: ai.kind === 'food_beverage' ? 'F&B' : (ai.kind === 'accommodation' ? 'Room Add-ons' : 'Services'),
                item_type: ai.kind === 'food_beverage' ? 'food' : (ai.kind === 'accommodation' ? 'room' : 'service'),
                description: ai.description || '',
              }));
              const combinedItems = [...fallbackItems, ...availableItems].filter(item => 
                offersAccommodation || (item.item_type !== 'room' && item.category !== 'Room Add-ons')
              );
              const uniqueItems = Array.from(new Map(
                combinedItems.map((item) => [item.name.trim().toLowerCase(), item])
              ).values()).sort((left, right) => left.name.localeCompare(right.name));
              setCatalog(uniqueItems);
              const baseCategories = ['All', 'F&B', 'Services'];
              if (offersAccommodation) baseCategories.splice(2, 0, 'Room Add-ons');
              const categorySet = new Set(baseCategories);
              uniqueItems.forEach((item) => item.category && categorySet.add(item.category));
              setCategories(Array.from(categorySet));
              if (!offersAccommodation) setSelectedCategory((current) => (current === 'Room Add-ons' ? 'All' : current));
              setIsLoading(false);
            }
            return;
          }
        }
      } catch (e) {
        console.warn('API catalog fetch failed, loading curated defaults', e);
      }

      if (isMounted) {
        const fallbackList: CatalogItemPayload[] = [];
        (activeItems || [])
          .filter(ai => offersAccommodation || (ai.kind !== 'accommodation' && ai.category !== 'Room Add-ons'))
          .forEach(ai => {
          fallbackList.push({
            id: ai.id,
            name: ai.name,
            price: ai.kind === 'accommodation' ? ai.nightlyRate.amountMinor : ai.price.amountMinor,
            tax_rate: defaultGstRate(ai),
            category: ai.kind === 'food_beverage' ? 'F&B' : (ai.kind === 'accommodation' ? 'Room Add-ons' : 'Services'),
            item_type: ai.kind === 'food_beverage' ? 'food' : (ai.kind === 'accommodation' ? 'room' : 'service'),
            description: ai.description || '',
          });
        });

        setCatalog(fallbackList);
        const baseCategories = ['All', 'F&B', 'Services'];
        if (offersAccommodation) baseCategories.splice(2, 0, 'Room Add-ons');
        const catSet = new Set(baseCategories);
        fallbackList.forEach(item => {
          if (item.category) catSet.add(item.category);
        });
        setCategories(Array.from(catSet));
        if (!offersAccommodation) setSelectedCategory((current) => (current === 'Room Add-ons' ? 'All' : current));
        setIsLoading(false);
      }
    }

    fetchCatalog();

    return () => {
      isMounted = false;
    };
  }, [activeItems, cafeId, offersAccommodation]);

  const isFoodItem = (item: CatalogItemPayload) => {
    const type = (item.item_type || '').toLowerCase();
    return ['food', 'food_beverage', 'beverage', 'drink'].includes(type) || item.category === 'F&B';
  };

  const isEditableService = (item: CatalogItemPayload) =>
    item.item_type?.toLowerCase() === 'service' &&
    (item.metadata?.source === 'room_category_addon'
      ? Boolean(item.metadata.room_category_id)
      : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id));

  const handleSaveServicePrice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!priceEditorItem) return;
    const price = Number(priceDraft);
    if (!Number.isFinite(price) || price < 0) {
      setPriceError('Enter a valid price of zero or more.');
      return;
    }

    setIsSavingPrice(true);
    setPriceError('');
    try {
      const response = await fetch('/api/host/catalog/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: priceEditorItem.id,
          name: priceEditorItem.name,
          item_type: priceEditorItem.item_type,
          category: priceEditorItem.category,
          price,
          description: priceEditorItem.description || '',
          image_url: priceEditorItem.image_url || null,
          metadata: priceEditorItem.metadata || {},
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update service price.');
      setCatalog((current) => current.map((item) =>
        item.id === priceEditorItem.id ? { ...item, price } : item
      ));
      setPriceEditorItem(null);
    } catch (error) {
      setPriceError(error instanceof Error ? error.message : 'Could not update service price.');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    (cartItems || []).forEach(item => {
      map.set(item.id, (map.get(item.id) || 0) + item.qty);
    });
    return map;
  }, [cartItems]);

  const catalogTrie = useMemo(() => {
    const trie = new CatalogTrie<CatalogItemPayload>();
    catalog.forEach(item => trie.insert(item));
    return trie;
  }, [catalog]);

  const filteredItems = useMemo(() => {
    const searchResults = searchQuery.trim() ? catalogTrie.search(searchQuery) : catalog;
    
    return searchResults.filter(item => {
      const matchCat = selectedCategory === 'All' ||
        (selectedCategory === 'F&B' ? isFoodItem(item) : item.category === selectedCategory);
      return matchCat;
    });
  }, [catalog, catalogTrie, selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: catalog.length, 'F&B': 0 };
    catalog.forEach(item => {
      const cat = item.category || 'Services';
      if (cat !== 'F&B') counts[cat] = (counts[cat] || 0) + 1;
      if (isFoodItem(item)) counts['F&B'] += 1;
    });
    return counts;
  }, [catalog]);

  const handleItemClick = (item: CatalogItemPayload) => {
    if (onAddItemToCart) {
      onAddItemToCart(item);
    } else if (addItem) {
      addItem(item.id);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-serif text-xl font-medium text-black tracking-tight">Catalog & Add-on Services</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Tap an item to add it. Tap again to add one more.</p>
        </div>

        {/* Quick Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            // Browser spellcheck extensions add attributes to this input before React hydrates.
            suppressHydrationWarning
            placeholder="Search the menu"
            className="w-full h-11 rounded-xl border border-zinc-200 bg-white pl-9 pr-10 text-[16px] sm:text-sm text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-zinc-400 hover:text-black cursor-pointer" aria-label="Clear search"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar min-w-0">
        {categories.map((cat) => {
          const count = categoryCounts[cat] ?? 0;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-[13px] sm:text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? 'border border-zinc-300 bg-white text-zinc-900 shadow-sm'
                  : 'border border-transparent bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
              }`}
            >
              <span>{cat}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isSelected ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Dynamic Grid */}
      <div className="mt-3 max-h-[56dvh] overflow-y-auto overscroll-contain pr-1 lg:max-h-[330px]">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-zinc-100 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid auto-rows-[104px] grid-cols-2 gap-2 sm:auto-rows-[112px] sm:grid-cols-3 sm:gap-2.5">
            {filteredItems.map((item) => {
              const inCartQty = cartQtyMap.get(item.id) || 0;
              const canEditPrice = isEditableService(item);
              return (
                <div key={item.id} className="relative h-full min-w-0">
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-xl border p-3 text-left transition-all cursor-pointer active:scale-[0.97] ${
                      inCartQty > 0
                        ? 'border-zinc-400 bg-zinc-50 shadow-sm'
                        : 'border-zinc-200/90 bg-zinc-50/50 hover:border-zinc-300 hover:bg-white hover:shadow-md'
                    }`}
                  >
                    {inCartQty > 0 && (
                      <span className={`absolute top-2.5 flex items-center justify-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-bold font-mono text-zinc-800 shadow-sm ${canEditPrice ? 'right-9' : 'right-2.5'}`}>
                        ×{inCartQty}
                      </span>
                    )}

                    <div className={canEditPrice ? 'pr-10' : 'pr-4'}>
                      <p className="font-medium text-xs sm:text-sm text-zinc-900 line-clamp-2 leading-tight">{item.name}</p>
                      <p className="mt-1 line-clamp-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                        {item.category} {item.description ? `• ${item.description}` : ''}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="font-mono text-xs font-semibold text-zinc-900">₹{item.price.toLocaleString('en-IN')}</p>
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-zinc-400 transition-colors group-hover:text-black"><Plus className="h-3 w-3" />Add</span>
                    </div>
                  </button>
                  {canEditPrice && (
                    <button
                      type="button"
                      title={`Edit price for ${item.name}`}
                      aria-label={`Edit price for ${item.name}`}
                      onClick={() => {
                        setPriceEditorItem(item);
                        setPriceDraft(String(item.price));
                        setPriceError('');
                      }}
                      className="absolute right-1.5 top-1.5 z-10 grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center">
            <Tag className="mx-auto h-6 w-6 text-zinc-300 mb-2" />
            <p className="text-xs text-zinc-500 font-medium">No items found matching &quot;{searchQuery}&quot;</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="mt-2 text-[11px] font-semibold text-black hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
      {priceEditorItem && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-neutral-900/20 p-4" role="presentation">
          <form onSubmit={handleSaveServicePrice} role="dialog" aria-modal="true" aria-labelledby="service-price-title" className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-sm">
            <h3 id="service-price-title" className="text-base font-semibold">Edit service price</h3>
            <p className="mt-1 truncate text-sm text-neutral-600">{priceEditorItem.name}</p>
            <label htmlFor="service-price" className="mt-4 block text-xs font-medium text-neutral-700">Price (₹)</label>
            <input id="service-price" type="number" inputMode="decimal" min="0" step="0.01" value={priceDraft} onChange={(event) => setPriceDraft(event.target.value)} className="mt-1 w-full h-11 rounded-lg border border-neutral-200 bg-white px-3 text-[16px] sm:text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-200" autoFocus />
            {priceError && <p role="alert" className="mt-2 text-xs text-rose-600">{priceError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPriceEditorItem(null)} disabled={isSavingPrice} className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-200 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={isSavingPrice} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"><Check className="h-3.5 w-3.5" />{isSavingPrice ? 'Saving…' : 'Save price'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
