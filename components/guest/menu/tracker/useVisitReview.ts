'use client';

import { useEffect, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

/**
 * A guest's review of this visit. One per settled bill on this phone: once sent, it is remembered, so coming back to the
 * page shows the thank-you instead of the form.
 */
export function useVisitReview(venueId: string | undefined, table: string, orderKey: string) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const storageKey = `qc_reviewed_${venueId || 'v'}_${table}_${orderKey}`;

  useEffect(() => {
    try { if (window.localStorage.getItem(storageKey)) setSent(true); } catch { /* storage blocked: the form simply shows */ }
  }, [storageKey]);

  const toggleTag = (tag: string) => setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag]));

  const submit = async () => {
    if (!venueId || rating < 1 || sending) return;
    setSending(true);
    setError('');
    const result = await apiRequest(`/api/guest/reviews?cafe_id=${encodeURIComponent(venueId)}`, jsonRequest('POST', {
      cafe_id: venueId, table, rating, comment: comment.trim(), tags,
    }));
    setSending(false);
    if (!result.ok) return setError('We could not send your review just now. Please try again.');
    setSent(true);
    try { window.localStorage.setItem(storageKey, '1'); } catch { /* the thank-you still shows */ }
  };

  return { rating, setRating, comment, setComment: (v: string) => setComment(v.slice(0, 500)), tags, toggleTag, sending, sent, error, submit };
}
