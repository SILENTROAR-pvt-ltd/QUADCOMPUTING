import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { CatalogItem } from '@/types';
import { catalogStatus } from './catalog-status';

export interface CatalogDebugInfo {
  queryVenue: string;
  count: number;
  error: string | null;
}

export function useCatalogData(propCafeId?: string) {
  const searchParams = useSearchParams();
  const serviceCatalog = useHostWorkspace((state) => state.serviceCatalog);

  // Extract active cafe/venue ID from prop or search params
  const rawCafeParam =
    propCafeId ||
    searchParams.get('cafe_id') ||
    searchParams.get('venue') ||
    searchParams.get('business_id') ||
    searchParams.get('venue_id') ||
    searchParams.get('branchId');

  const uuidMatch = rawCafeParam
    ? rawCafeParam.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    : null;

  const activeCafeId = uuidMatch
    ? uuidMatch[0]
    : rawCafeParam && rawCafeParam !== 'undefined' && rawCafeParam !== 'null'
    ? rawCafeParam.trim()
    : '';

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<CatalogDebugInfo | null>(null);

  const fetchCatalog = useCallback(async (targetVenueId: string, showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setFetchError(null);

    try {
      const url = targetVenueId ? `/api/host/catalog?cafe_id=${encodeURIComponent(targetVenueId)}` : '/api/host/catalog';
      const res = await fetch(url, {
        cache: 'no-store',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error || `HTTP ${res.status}: Failed to fetch menu catalog`;
        console.error('[CatalogWorkspace] Fetch catalog error:', msg);
        setFetchError(msg);
        setDebugInfo({ queryVenue: targetVenueId, count: 0, error: msg });
        return;
      }

      const data = await res.json();
      if (data.error) {
        console.error('[CatalogWorkspace] Supabase query returned error:', data.error);
        setFetchError(data.error);
      }

      const rawItems = Array.isArray(data.items) ? data.items : [];
      setDebugInfo({ queryVenue: targetVenueId, count: rawItems.length, error: data.error || null });

      // Transform raw items into Canonical CatalogItem schema
      const mappedCatalog: CatalogItem[] = rawItems.map((item: any) => {
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
            status: catalogStatus(item),
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
            status: catalogStatus(item),
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
          status: catalogStatus(item),
          addons: [],
          kind: 'food_beverage',
          // The venue's own category (e.g. "Quick Bites"): the edit form, filters and labels all read it.
          category: (item.category || '').trim(),
          course,
          dietary: 'veg',
          price: { amountMinor: priceNum, currency: 'INR' },
          prepTimeMinutes: item.metadata?.prep_time_minutes || 15,
          allergens: [],
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.created_at || new Date().toISOString(),
        } as unknown as CatalogItem;
      });

      const currentSnapshot = useHostWorkspace.getState();
      useHostWorkspace.getState().adoptSnapshot({
        ...currentSnapshot,
        serviceCatalog: mappedCatalog,
      });
    } catch (err: any) {
      console.error('[CatalogWorkspace] Unexpected catalog fetch exception:', err);
      setFetchError(err.message || 'Network error fetching catalog');
      setDebugInfo({ queryVenue: targetVenueId, count: 0, error: err.message });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog(activeCafeId);
  }, [activeCafeId, fetchCatalog]);

  const refreshCatalog = useCallback(async () => {
    await fetchCatalog(activeCafeId, true);
  }, [activeCafeId, fetchCatalog]);

  return {
    activeCafeId,
    serviceCatalog,
    isLoading,
    isRefreshing,
    fetchError,
    debugInfo,
    fetchCatalog,
    refreshCatalog,
  };
}
