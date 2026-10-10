import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { canonicalGuestId, WalletClaimUnavailableError } from '@/lib/services/wallet/wallet-claim.service';
import { walletOwnership } from '@/lib/services/guest-auth/wallet-ownership';

import { HANDLE_PATTERN } from '@/lib/services/wallet/host-wallet-view.service';
import { historyToCsv, MAX_EXPORT, parseHistoryFilters, queryWalletHistory } from '@/lib/services/wallet/wallet-history.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guest/wallet/history?handle=@name&venue_id=&type=&from=&to=&q=&before=&limit=&format=csv
 *
 * The history of every wallet the device proves it owns (wallet secret + claim), across venues.
 * A handle the device does not own returns an empty history, so ownership can't be probed.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const url = new URL(request.url);
  const handle = (url.searchParams.get('handle') || '').trim().toLowerCase();
  if (!HANDLE_PATTERN.test(handle)) {
    return NextResponse.json({ success: false, error: 'A valid guest handle is required.' }, { status: 400 });
  }

  const parsed = parseHistoryFilters(url.searchParams);
  if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  const { filters } = parsed;
  const csv = url.searchParams.get('format') === 'csv';

  const limited = await enforceRateLimit(request, csv ? 'guest_wallet_history_csv' : 'guest_wallet_history', csv ? 10 : 120, 60_000);
  if (limited) return limited;

  const db = adminDb();
  let owned: string[];
  try {
    owned = (await walletOwnership(db, request, [handle])).owned
      .map(canonicalGuestId)
      .filter((id) => id.startsWith('@'));
  } catch (e) {
    if (e instanceof WalletClaimUnavailableError) {
      return NextResponse.json({ success: false, error: 'Wallet is temporarily unavailable. Please retry.' }, { status: 503 });
    }
    throw e;
  }
  if (!owned.includes(handle)) owned = [];

  const headers = { 'Cache-Control': 'no-store' };
  if (csv) {
    const result = await queryWalletHistory(db, owned, { ...filters, before: null, limit: MAX_EXPORT });
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(historyToCsv(result.transactions), {
      headers: {
        ...headers,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="wallet-history-${stamp}.csv"`,
      },
    });
  }

  const result = await queryWalletHistory(db, owned, filters);
  return NextResponse.json({ success: true, ...result }, { headers });
}, 'GuestWalletHistoryGET');
