import type { PlanTier } from '@/types/wallet';
import { mem } from './wallet-memory.store';
import { getVenuePendingTopup } from './topup-request-queries.service';
import { planState } from './subscription-state';
import { adminDb } from '@/lib/supabase/admin';

/**
 * The only plan change a venue can make for itself: back to pay-as-you-go. Paid plans start only
 * when the platform approves a verified payment (approve_topup_request), never from this call.
 * A plan that is still paid up is not dropped either: it would throw away months already paid for.
 */
export async function updateVenuePlan(
  supabase: any,
  venueId: string,
  planTier: PlanTier,
  bypassPendingCheck: boolean = false
) {
  if (planTier !== 'pay_as_you_go') {
    return { success: false, error: 'Paid plans start once your payment is verified. Choose a plan and submit its payment.' };
  }
  if (!bypassPendingCheck && (await getVenuePendingTopup(supabase, venueId))) {
    return { success: false, error: 'A payment is being verified. Plan changes unlock once it is reviewed.' };
  }

  const db = adminDb();
  const { data: sub } = await db.from('venue_subscriptions').select('*').eq('venue_id', venueId).maybeSingle();
  const state = planState(sub);
  if (state.feesWaived) {
    const until = new Date(state.endsAt as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return { success: false, error: `Your ${state.plan?.name} plan is paid until ${until}. It moves to pay-as-you-go by itself when it ends.` };
  }

  const patch = { plan_tier: 'pay_as_you_go' as const, status: 'active' as const, trial_ends_at: null, expires_at: null, updated_at: new Date().toISOString() };
  const { error } = await db.from('venue_subscriptions').update(patch).eq('venue_id', venueId);
  if (error) {
    console.error('[updateVenuePlan] update failed:', { venueId, code: error.code });
    return { success: false, error: 'Could not change the plan. Please try again.' };
  }

  if (mem.has(venueId)) Object.assign(mem.get(venueId)!.subscription, patch);
  return { success: true, planTier: 'pay_as_you_go' as const };
}
