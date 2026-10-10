import { useState, useEffect, useCallback } from 'react';
import type { VenueLiveOffer } from '@/types/offers';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

export function useLiveOffers(venueId: string, onOffersUpdated?: () => void) {
  const [offers, setOffers] = useState<VenueLiveOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchOffers = useCallback(
    async (manual = false) => {
      if (manual) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const res = await fetch(
          `/api/venue/offers?venue_id=${encodeURIComponent(venueId)}&active_only=false`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.offers)) {
            setOffers(json.offers);
          }
        }
      } catch (err) {
        console.warn('[useLiveOffers] Fetch error:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [venueId]
  );

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleToggleActive = async (offer: VenueLiveOffer) => {
    const nextState = !offer.is_active;
    setActionError(null);
    setOffers((prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, is_active: nextState } : o))
    );

    const result = await apiRequest('/api/venue/offers', jsonRequest('PATCH', { id: offer.id, is_active: nextState }));
    if (!result.ok) {
      setActionError(result.error);
      fetchOffers(); // roll the optimistic change back to what the server actually has
      return;
    }
    if (onOffersUpdated) onOffersUpdated();
  };

  const handleDeleteOffer = async (id: string, offerTitle: string) => {
    if (!window.confirm(`Are you sure you want to remove "${offerTitle}"?`)) return;

    setActionError(null);
    setOffers((prev) => prev.filter((o) => o.id !== id));
    const result = await apiRequest(`/api/venue/offers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!result.ok) {
      setActionError(result.error);
      fetchOffers();
      return;
    }
    if (onOffersUpdated) onOffersUpdated();
  };
  return {
    offers,
    isLoading,
    isRefreshing,
    actionError,
    fetchOffers,
    handleToggleActive,
    handleDeleteOffer,
  };
}
