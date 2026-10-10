'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

interface LikesState {
  /** False until the venue's database has dish likes: hearts stay hidden instead of failing. */
  available: boolean;
  counts: Record<string, number>;
  mine: Set<string>;
}

const EMPTY: LikesState = { available: false, counts: {}, mine: new Set() };

function applyToggle(s: LikesState, itemId: string, liked: boolean, likes?: number): LikesState {
  const mine = new Set(s.mine);
  if (liked) mine.add(itemId); else mine.delete(itemId);
  const fallback = Math.max(0, (s.counts[itemId] || 0) + (liked ? 1 : -1));
  return { ...s, mine, counts: { ...s.counts, [itemId]: likes ?? fallback } };
}

/** Dish likes for the menu: counts, the guest's own likes, and liking a dish (shown at once, confirmed by the server). */
export function useDishLikes(venueId: string, onMessage: (message: string) => void) {
  const [state, setState] = useState<LikesState>(EMPTY);
  const [pending, setPending] = useState<string | null>(null);
  const url = `/api/guest/menu/likes?cafe_id=${encodeURIComponent(venueId)}`;

  const load = useCallback(async () => {
    if (!venueId) return;
    const res = await apiRequest<any>(url, { cache: 'no-store' });
    if (res.ok && res.data) {
      setState({ available: Boolean(res.data.available), counts: res.data.counts || {}, mine: new Set(res.data.mine || []) });
    }
  }, [venueId, url]);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (itemId: string) => {
    if (pending) return;
    const wasLiked = state.mine.has(itemId);
    setState((s) => applyToggle(s, itemId, !wasLiked));
    setPending(itemId);
    const res = await apiRequest<any>(url, jsonRequest('POST', { item_id: itemId }));
    setPending(null);
    if (!res.ok) {
      setState((s) => applyToggle(s, itemId, wasLiked));
      onMessage(res.error || 'Could not save that. Please try again.');
      return;
    }
    setState((s) => applyToggle(s, itemId, Boolean(res.data?.liked), Number(res.data?.likes)));
  };

  return { available: state.available, counts: state.counts, mine: state.mine, pending, toggle };
}
