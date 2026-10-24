import type { PurchaseId, TopupRequestType, VenueTopupRequest } from '@/types/wallet';
import { memTopupRequests } from './wallet-memory.store';
import { getVenuePendingTopup } from './topup-request-queries.service';

/** A problem the venue can fix: its message is safe to show (unlike a raw database error). */
export class TopupRequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export async function createTopupRequest(
  supabase: any,
  params: {
    venueId: string;
    amount: number;
    utrNumber: string;
    paymentMethod?: string;
    requestedPlanTier?: PurchaseId | null;
    requestType?: TopupRequestType;
    notes?: string | null;
  }
) {
  const { venueId, amount, utrNumber, paymentMethod = 'upi_manual', requestedPlanTier = null, requestType, notes = '' } = params;

  if (!(amount > 0)) throw new TopupRequestError('Invalid top-up amount');
  if (!utrNumber || !utrNumber.trim()) throw new TopupRequestError('UTR / Transaction reference is required');

  const existingPending = await getVenuePendingTopup(supabase, venueId);
  if (existingPending) {
    throw new TopupRequestError('A payment is already being verified for this venue. You can submit another once it is reviewed.', 409);
  }

  const finalType: TopupRequestType =
    requestType || (requestedPlanTier && requestedPlanTier !== 'pay_as_you_go' ? 'plan_subscription' : 'wallet_topup');

  // The DB row is the only source of truth the admin desk reads. A per-instance memory
  // copy that the admin can never see must not be reported to the host as "submitted".
  const { data, error } = await supabase
    .from('venue_topup_requests')
    .insert({
      venue_id: venueId,
      amount,
      utr_number: utrNumber.trim(),
      payment_method: paymentMethod,
      requested_plan_tier: requestedPlanTier,
      request_type: finalType,
      status: 'pending',
      notes: notes || null,
    })
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      throw new TopupRequestError('This UTR / transaction reference has already been submitted.', 409);
    }
    // A plan id the database does not accept yet (migration 20261024000001 not applied).
    if (error.code === '23514') {
      throw new TopupRequestError('This purchase opens once the new plans are switched on. Please try again soon.', 503);
    }
    console.error('[createTopupRequest] insert failed:', { venueId, code: error.code, message: error.message });
    throw new TopupRequestError('Could not record your payment request. Please try again.', 500);
  }
  if (!data) throw new TopupRequestError('Could not record your payment request. Please try again.', 500);

  memTopupRequests.unshift(data as VenueTopupRequest);
  return { success: true, request: data as VenueTopupRequest };
}
