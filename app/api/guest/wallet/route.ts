import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { getGuestWallet } from '@/lib/services/wallet/cashback.service';
import { canonicalGuestId, WalletClaimUnavailableError } from '@/lib/services/wallet/wallet-claim.service';
import { walletOwnership } from '@/lib/services/guest-auth/wallet-ownership';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function emptyWallet(guestId: string, businessId: string) {
  return {
    success: true,
    wallet: {
      id: 'wlt-current',
      guest_id: guestId,
      business_id: businessId,
      cafe_id: businessId,
      balance: 0,
      total_cashback_earned: 0,
      updated_at: new Date().toISOString(),
    },
    transactions: [],
    cafe_wallets: [],
    global_balance: 0,
  };
}

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guest_id') || searchParams.get('session_id') || searchParams.get('handle') || searchParams.get('phone') || 'gst-current';
    const businessId = searchParams.get('cafe_id') || searchParams.get('business_id') || searchParams.get('venue_id');

    if (!businessId || !UUID_REGEX.test(businessId)) {
      return NextResponse.json({ error: 'Valid cafe_id UUID is required' }, { status: 404 });
    }

    const limited = await enforceRateLimit(request, 'guest_wallet_get', 240, 60_000, businessId);
    if (limited) return limited;

    const admin = adminDb();
    const { data: biz, error: bizErr } = await admin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .maybeSingle();

    if (bizErr || !biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Only identifiers the caller can prove ownership of are used. Names are never identifiers.
    const candidates = [
      guestId,
      searchParams.get('handle'),
      searchParams.get('guest_handle'),
      searchParams.get('phone'),
      searchParams.get('customer_phone'),
      searchParams.get('session_id'),
    ].filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim().length > 0 && id !== 'gst-current'));

    let claim;
    try {
      claim = await walletOwnership(admin, request, candidates);
    } catch (e) {
      if (e instanceof WalletClaimUnavailableError) {
        return NextResponse.json({ success: false, error: 'Wallet is temporarily unavailable. Please retry.' }, { status: 503 });
      }
      throw e;
    }
    const owned = Array.from(new Set(claim.owned.map(canonicalGuestId)));
    const taken = claim.taken;

    // True when the guest's chosen @handle already belongs to a different device. Lets the
    // handle-claim screen ask for another handle instead of silently sharing someone's wallet.
    const handle_taken = taken.some((id) => id.startsWith('@'));

    // Not owned looks exactly like "no wallet yet", so wallets can't be probed for existence.
    if (owned.length === 0) return NextResponse.json({ ...emptyWallet(guestId, biz.id), handle_taken });

    const result = await getGuestWallet(admin, owned[0], biz.id, owned.slice(1));
    return NextResponse.json({ ...result, handle_taken });
  } catch (error: any) {
    console.error('[API Guest Wallet GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, 'GuestWalletGET')
