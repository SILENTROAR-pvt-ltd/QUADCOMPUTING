import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { getVenueWalletDetails, updateVenuePlan, createTopupRequest } from '@/lib/services/wallet/venue-wallet.service';
import { TopupRequestError } from '@/lib/services/wallet/topup-request-create.service';
import { parseTopup } from '@/lib/services/wallet/topup-input';
import { platformPayment } from '@/lib/services/wallet/platform-payment';
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
 * A venue can file a payment for verification (a wallet top-up, or a plan at the plan's price) and
 * move back to pay-as-you-go. It can never credit its wallet or start a paid plan by itself: both
 * happen only when the platform approves a verified payment.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return fail('Invalid request');
    if (body.venueId && body.venueId !== businessId) return fail('Forbidden: Venue mismatch', 403);

    if (body.action === 'submit_topup_request' || body.action === 'topup') {
      const parsed = parseTopup(body);
      if (!parsed.ok) return fail(parsed.error);
      const res = await createTopupRequest(supabase, { venueId: businessId, paymentMethod: 'upi_manual', ...parsed.value });
      return NextResponse.json(res);
    }

    if (body.action === 'select_plan') {
      if (body.planTier !== 'pay_as_you_go') {
        return fail('Paid plans start once your payment is verified. Choose a plan and submit its payment.', 403);
      }
      const res = await updateVenuePlan(supabase, businessId, 'pay_as_you_go');
      return res.success ? NextResponse.json(res) : fail(res.error as string, 409);
    }

    return fail('Unknown action');
  } catch (error) {
    if (error instanceof TopupRequestError) return fail(error.message, error.status);
    return handleApiError(error, request, 'HostWalletPOST');
  }
}, 'HostWalletPOST');
