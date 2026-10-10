import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { createRedemptionRequest } from '@/lib/services/wallet/redemption.service';
import { WalletStoreError } from '@/lib/services/wallet/cashback.service';
import { canonicalGuestId, WalletClaimUnavailableError } from '@/lib/services/wallet/wallet-claim.service';
import { walletOwnership } from '@/lib/services/guest-auth/wallet-ownership';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';

const withAt = (h: string) => canonicalGuestId(h.startsWith('@') ? h : `@${h}`);

async function ownedIdentifiers(request: Request, ids: Array<string | null | undefined>): Promise<string[] | NextResponse> {
  try {
    return (await walletOwnership(adminDb(), request, ids)).owned;
  } catch (e) {
    if (e instanceof WalletClaimUnavailableError) {
      return NextResponse.json({ success: false, error: 'Wallet is temporarily unavailable. Please retry.' }, { status: 503 });
    }
    throw e;
  }
}

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryCafeId = searchParams.get('cafe_id') || searchParams.get('business_id');
    const body = await request.json().catch(() => ({}));

    const rawCafeId = queryCafeId || body?.cafe_id || body?.business_id;
    const validation = await validateGuestAccess(rawCafeId);
    if (validation.error) return validation.error;
    const { businessId } = validation;

    const limited = await enforceRateLimit(request, 'guest_redeem_post', 60, 60_000, businessId);
    if (limited) return limited;

    // The redemption is created for one identity; the caller must prove they own it.
    const handle = body?.guest_handle ? withAt(String(body.guest_handle).trim()) : null;
    const claimed = [handle, body?.guest_id, body?.customer_phone].filter((v) => typeof v === 'string' && v.trim()) as string[];
    const owned = await ownedIdentifiers(request, claimed);
    if (owned instanceof NextResponse) return owned;

    const primary = handle || (body?.guest_id ? canonicalGuestId(String(body.guest_id)) : undefined);
    if (!primary || !owned.some((id) => id.trim().toLowerCase() === String(primary).trim().toLowerCase())) {
      return NextResponse.json({ success: false, error: 'This wallet is linked to a different device.', code: 'WALLET_NOT_OWNED' }, { status: 403 });
    }

    const payload = {
      ...body,
      cafe_id: businessId,
      business_id: businessId,
      guest_id: primary,
      guest_handle: handle || undefined,
      customer_phone: owned.includes(body?.customer_phone) ? body.customer_phone : undefined,
    };

    // Not replayed from the idempotency cache: a cached code could be used up by the time the
    // guest taps again. createRedemptionRequest already returns the live pending code instead
    // of minting a second one, so repeated taps are safe without it.
    const result = await createRedemptionRequest(adminDb(), payload);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('[API Guest Wallet Redeem POST]', error);
    if (error instanceof WalletStoreError) {
      return NextResponse.json({ success: false, error: 'Wallet is temporarily unavailable. Please try again.', code: error.code }, { status: 503 });
    }
    return NextResponse.json({ success: false, error: 'Could not create the redemption code. Please try again.' }, { status: 500 });
  }
}, 'GuestWalletRedeemPOST')

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guest_id') || searchParams.get('handle');
    const cafeIdRaw = searchParams.get('cafe_id') || searchParams.get('business_id');

    const validation = await validateGuestAccess(cafeIdRaw);
    if (validation.error) return validation.error;
    const { businessId: cafeId } = validation;

    if (!guestId) {
      return NextResponse.json({ success: false, error: 'guest_id required' }, { status: 400 });
    }

    const limited = await enforceRateLimit(request, 'guest_redeem_get', 240, 60_000, cafeId);
    if (limited) return limited;

    const cleanHandle = withAt(guestId);
    const canonicalId = canonicalGuestId(guestId);
    const owned = await ownedIdentifiers(request, [guestId, cleanHandle]);
    if (owned instanceof NextResponse) return owned;
    if (owned.length === 0) return NextResponse.json({ success: true, active_redemption: null });

    const db = adminDb();
    const nowIso = new Date().toISOString();
    const base = () =>
      db.from('wallet_redemptions')
        .select('*')
        .eq('business_id', cafeId)
        .in('status', ['pending', 'verified'])
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(1);

    let { data: active, error } = await base().in('guest_id', Array.from(new Set([canonicalId, cleanHandle]))).maybeSingle();
    if (error) throw error;
    if (!active) {
      ({ data: active, error } = await base().eq('guest_handle', cleanHandle).maybeSingle());
      if (error) throw error;
    }

    return NextResponse.json({ success: true, active_redemption: active || null });
  } catch (error: any) {
    console.error('[API Guest Wallet Redeem GET]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}, 'GuestWalletRedeemGET')
