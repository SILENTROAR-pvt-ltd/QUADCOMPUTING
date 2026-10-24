import { masterUnlockRequired } from '@/lib/services/security/master-unlock-guard';
import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { getVenueWalletDetails, updateVenuePlan, createTopupRequest } from '@/lib/services/wallet/venue-wallet.service';
import { TopupRequestError } from '@/lib/services/wallet/topup-request-create.service';
import { parseTopup } from '@/lib/services/wallet/topup-input';
import { platformPayment } from '@/lib/services/wallet/platform-payment';
import { adminDb } from '@/lib/supabase/admin';
import { startTrial } from '@/lib/services/wallet/trial.service';
import { paidPlanRunning, planState } from '@/lib/services/wallet/subscription-state';
import { purchasablePlan, VIBEY_ADDON } from '@/lib/services/wallet/plans';
import { canBuyVibeyAddon, entitlementsOf } from '@/lib/services/billing/entitlements';
import { clearEntitlements } from '@/lib/services/billing/feature-gate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';

export const dynamic = 'force-dynamic';

const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const details = await getVenueWalletDetails(auth.supabase, auth.businessId);
    return NextResponse.json({ success: true, ...details, payment: platformPayment() });
  } catch (error) {
    return handleApiError(error, request, 'HostWalletGET');
  }
}, 'HostWalletGET');

/**
 * A venue can file a payment for verification (a wallet top-up, a plan or the Vibey add-on at its price), start its one free
 * month of M¹-Pro or M²-Pro, and move back to per bill. It can never credit its wallet or start a paid plan by itself:
 * both happen only when the platform approves a verified payment.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const locked = masterUnlockRequired(request, auth);
    if (locked) return locked;
    const { businessId, supabase } = auth;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return fail('Invalid request');
    if (body.venueId && body.venueId !== businessId) return fail('Forbidden: Venue mismatch', 403);

    if (body.action === 'submit_topup_request' || body.action === 'topup') {
      // The setup fee is owed once: whether it is still due comes from the venue's own subscription row.
      const { data: sub } = await adminDb().from('venue_subscriptions').select('*').eq('venue_id', businessId).maybeSingle();
      const parsed = parseTopup(body, sub);
      if (!parsed.ok) return fail(parsed.error);
      const running = planState(sub);
      // The Vibey add-on goes on top of M¹-Pro or M²-Pro; You earn, we earn and Rhodium Pro already include Vibey.
      if (parsed.value.requestedPlanTier === VIBEY_ADDON.id && !canBuyVibeyAddon(entitlementsOf(sub))) {
        return fail('Vibey is already included in You earn, we earn and Rhodium Pro. The add-on is for M¹-Pro and M²-Pro venues.', 409);
      }
      // A smaller plan waits for renewal: buying it now would cut short the months already paid for.
      const wanted = purchasablePlan(parsed.value.requestedPlanTier);
      if (wanted && paidPlanRunning(running) && running.plan && wanted.price < running.plan.price) {
        return fail(`Your ${running.plan.name} plan runs until ${new Date(running.endsAt as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. A smaller plan can start from your renewal.`, 409);
      }
      const res = await createTopupRequest(supabase, { venueId: businessId, paymentMethod: 'upi_manual', ...parsed.value });
      return NextResponse.json(res);
    }

    if (body.action === 'start_trial') {
      const res = await startTrial(adminDb(), businessId, body.planTier);
      clearEntitlements(businessId);
      return res.ok ? NextResponse.json({ success: true, ...res }) : fail(res.error, res.status);
    }

    if (body.action === 'select_plan') {
      if (body.planTier !== 'pay_as_you_go') {
        return fail('Paid plans start once your payment is verified. Choose a plan and submit its payment.', 403);
      }
      const res = await updateVenuePlan(supabase, businessId, 'pay_as_you_go');
      clearEntitlements(businessId);
      return res.success ? NextResponse.json(res) : fail(res.error as string, 409);
    }

    return fail('Unknown action');
  } catch (error) {
    if (error instanceof TopupRequestError) return fail(error.message, error.status);
    return handleApiError(error, request, 'HostWalletPOST');
  }
}, 'HostWalletPOST');
