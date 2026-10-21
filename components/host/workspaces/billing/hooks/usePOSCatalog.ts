'use client';

import { useEffect, useCallback } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { CatalogItem } from '@/types';

export function mapRawCatalogItems(rawItems: any[], targetVenueId: string): CatalogItem[] {
  return (rawItems || []).map((item: any) => {
    const itemType = (
      item.item_type ||
      (item.category?.toLowerCase().includes('accommodation') ? 'room' : 'food')
    ).toLowerCase();
    const priceNum = Number(item.price) || 0;
    const isAccommodation = itemType === 'room' || item.category === 'Accommodations';
    const isService =
      itemType === 'service' || item.category === 'Room Add-ons' || item.category === 'Services';

    if (isAccommodation) {
      return {
        id: item.id,
        branchId: item.location_id || targetVenueId,
        name: item.name,
        description: item.description || '',
        imageUrl: item.image_url || null,
        status: item.is_available ? 'active' : 'sold_out',
        addons: [],
        kind: 'accommodation',
        roomType: 'deluxe',
        nightlyRate: { amountMinor: priceNum, currency: 'INR' },
        capacity: item.metadata?.capacity || null,
        occupancy: { adults: item.metadata?.capacity || 2, children: 0 },
        inventoryCount: 1,
        amenities: item.metadata?.amenities || ['High-Speed Wi-Fi', 'Air Conditioning', 'King Size Bed'],
        createdAt: item.created_at || new Date().toISOString(),
        updatedAt: item.created_at || new Date().toISOString(),
      } as unknown as CatalogItem;
    }

    if (isService) {
      return {
        id: item.id,
        branchId: item.location_id || targetVenueId,
        name: item.name,
        description: item.description || '',
        imageUrl: item.image_url || null,
        status: item.is_available ? 'active' : 'sold_out',
        addons: [],
        kind: 'service',
        price: { amountMinor: priceNum, currency: 'INR' },
        category: item.category || 'Services',
        metadata: item.metadata || {},
        createdAt: item.created_at || new Date().toISOString(),
        updatedAt: item.created_at || new Date().toISOString(),
      } as unknown as CatalogItem;
    }

    let course: 'starter' | 'main' | 'side' | 'dessert' | 'beverage' = 'main';
    const catLower = (item.category || '').toLowerCase();
    if (catLower.includes('starter') || catLower.includes('appetizer')) course = 'starter';
    else if (catLower.includes('dessert') || catLower.includes('sweet')) course = 'dessert';
    else if (catLower.includes('beverage') || catLower.includes('drink') || catLower.includes('coffee'))
      course = 'beverage';
    else if (catLower.includes('side')) course = 'side';

    return {
      id: item.id,
      branchId: item.location_id || targetVenueId,
      name: item.name,
      description: item.description || '',
      imageUrl: item.image_url || null,
      status: item.is_available ? 'active' : 'sold_out',
      addons: [],
      kind: 'food_beverage',
      course,
      dietary: 'veg',
      price: { amountMinor: priceNum, currency: 'INR' },
      prepTimeMinutes: item.metadata?.prep_time_minutes || 15,
      allergens: [],
      createdAt: item.created_at || new Date().toISOString(),
      updatedAt: item.created_at || new Date().toISOString(),
    } as unknown as CatalogItem;
  });
}

/** A failed network round trip (the connection dropped, or the dev server was restarting): not a fault in the catalog. */
const isNetworkFailure = (e: unknown) => e instanceof TypeError || (e as any)?.name === 'AbortError';
const RETRY_MS = 2500;

export function usePOSCatalog(businessId?: string | null) {
  const serviceCatalog = useHostWorkspace((state) => state.serviceCatalog);
  const targetVenueId = businessId || '';

  const hydrateCatalog = useCallback(async (attempt = 0): Promise<void> => {
    const cacheKey = `pos_catalog_cache_${targetVenueId}`;
    if (typeof window !== 'undefined') localStorage.removeItem('pos_catalog_cache'); // Cleanup legacy cross-tenant leak

    // 1. Instant hydration from localStorage if state is empty
    if (typeof window !== 'undefined' && serviceCatalog.length === 0) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Verify items actually belong to this venue (extra safety)
            const validItems = parsed.filter(i => !i.branchId || i.branchId === targetVenueId);
            if (validItems.length > 0) {
              const currentSnapshot = useHostWorkspace.getState();
              useHostWorkspace.getState().adoptSnapshot({
                ...currentSnapshot,
                serviceCatalog: validItems,
              });
            }
          }
        }
      } catch {}
    }

    // 2. Fetch live catalog from backend
    try {
      const url = targetVenueId ? `/api/host/catalog?cafe_id=${encodeURIComponent(targetVenueId)}` : '/api/host/catalog';
      const res = await fetch(url, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const rawItems = Array.isArray(data.items) ? data.items : [];
      
      const mapped = mapRawCatalogItems(rawItems, targetVenueId);
      const currentSnapshot = useHostWorkspace.getState();
      useHostWorkspace.getState().adoptSnapshot({
        ...currentSnapshot,
        serviceCatalog: mapped,
      });
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(mapped));
        } catch {}
      }
    } catch (e) {
      // The cached catalog (if any) stays on screen. A dropped connection is retried a few times, then left to the
      // next visit of the tab; only an unexpected failure is reported as an error.
      if (isNetworkFailure(e)) {
        if (attempt < 3) setTimeout(() => void hydrateCatalog(attempt + 1), RETRY_MS * (attempt + 1));
        else console.warn('[usePOSCatalog] the catalog could not be reached; using what is cached');
        return;
      }
      console.error('[usePOSCatalog] Failed to load catalog items:', e);
    }
  }, [targetVenueId, serviceCatalog.length]);

  useEffect(() => {
    void hydrateCatalog();
    const onVisible = () => { if (document.visibilityState === 'visible') void hydrateCatalog(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [hydrateCatalog]);

  return { serviceCatalog };
}
