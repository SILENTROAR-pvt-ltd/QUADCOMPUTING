'use client';

import { useEffect, useState } from 'react';
import type { VenueLiveOffer } from '@/types/offers';
import { fetchOfferRequestStatus, sendOfferRequest, type OfferRequestStatus } from '@/lib/guest/offer-requests-client';

const POLL_MS = 5000;

/**
 * One offer, acted on: redeem it for a code the host settles (followed until the host settles or cancels it), or send the
 * host a question about it.
 */
export function useOfferRequest(venueId: string, tableNumber: string, offer: VenueLiveOffer) {
  const [redemption, setRedemption] = useState<OfferRequestStatus | null>(null);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id = redemption?.id;
  const open = redemption?.status === 'open';

  useEffect(() => {
    if (!id || !open) return;
    const timer = setInterval(async () => {
      const out = await fetchOfferRequestStatus(venueId, id);
      if (out.ok) setRedemption(out.value);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [id, open, venueId]);

  const redeem = async () => {
    setBusy(true);
    setError(null);
    const out = await sendOfferRequest(venueId, tableNumber, { offer_id: offer.id, kind: 'redeem' });
    setBusy(false);
    if (out.ok) setRedemption({ id: out.value.id, kind: 'redeem', code: out.value.code, status: 'open', offer_title: offer.title });
    else setError(out.error);
  };

  const ask = async () => {
    setBusy(true);
    setError(null);
    const out = await sendOfferRequest(venueId, tableNumber, { offer_id: offer.id, kind: 'inquiry', message: question.trim() });
    setBusy(false);
    if (out.ok) { setAsked(true); setQuestion(''); } else setError(out.error);
  };

  return { redemption, question, setQuestion, asked, busy, error, redeem, ask };
}
