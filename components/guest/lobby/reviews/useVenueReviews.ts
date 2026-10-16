'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReviewItem, ReviewSubmissionPayload } from './review.types';

const THANKS_MS = 5000;

/** The venue's reviews: loaded once, and a new one added to the top only after the venue has really saved it. */
export function useVenueReviews(cafeId: string) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [thanks, setThanks] = useState(false);

  const load = useCallback(async () => {
    if (!cafeId) { setLoading(false); return; }
    setLoadError(false);
    try {
      const res = await fetch(`/api/guest/reviews?cafe_id=${encodeURIComponent(cafeId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.reviews)) throw new Error('bad response');
      setReviews(data.reviews);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => { void load(); }, [load]);

  /** Resolves null when saved, or the sentence to show in the sheet (the guest's words are kept). */
  const submit = async (payload: ReviewSubmissionPayload): Promise<string | null> => {
    try {
      const res = await fetch(`/api/guest/reviews?cafe_id=${encodeURIComponent(cafeId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, cafe_id: cafeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.review) return data?.error || 'We could not send your review just now. Please try again.';
      setReviews((prev) => [data.review as ReviewItem, ...prev]);
      setThanks(true);
      setTimeout(() => setThanks(false), THANKS_MS);
      return null;
    } catch {
      return 'We could not reach the venue. Please check your connection and try again.';
    }
  };

  return { reviews, loading, loadError, thanks, submit, retry: () => { setLoading(true); void load(); } };
}
