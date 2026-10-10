'use client';

import type { VenueLiveOffer } from '@/types/offers';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

export interface SentOfferRequest {
  id: string;
  code: string | null;
  status: string;
}

export interface OfferRequestStatus {
  id: string;
  kind: 'redeem' | 'inquiry';
  code: string | null;
  status: 'open' | 'settled' | 'closed';
  offer_title: string;
}

/** An offer the guest can still use: active, and not past its end time. */
export function isOfferLive(offer: Pick<VenueLiveOffer, 'is_active' | 'valid_until'>, now = Date.now()): boolean {
  return offer.is_active && (!offer.valid_until || Date.parse(offer.valid_until) > now);
}

export async function sendOfferRequest(
  venueId: string,
  tableNumber: string,
  input: { offer_id: string; kind: 'redeem' | 'inquiry'; message?: string; guest_name?: string }
) {
  const url = `/api/guest/offers/requests?cafe_id=${encodeURIComponent(venueId)}&table=${encodeURIComponent(tableNumber)}`;
  const result = await apiRequest<{ request: SentOfferRequest }>(url, jsonRequest('POST', input));
  return result.ok && result.data ? { ok: true as const, value: result.data.request } : { ok: false as const, error: result.error ?? 'Please try again.' };
}

export async function fetchOfferRequestStatus(venueId: string, id: string) {
  const result = await apiRequest<{ request: OfferRequestStatus }>(
    `/api/guest/offers/requests/${encodeURIComponent(id)}?cafe_id=${encodeURIComponent(venueId)}`,
    { cache: 'no-store' }
  );
  return result.ok && result.data ? { ok: true as const, value: result.data.request } : { ok: false as const, error: result.error ?? 'Please try again.' };
}
