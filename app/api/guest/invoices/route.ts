import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { canonicalGuestId, WalletClaimUnavailableError } from '@/lib/services/wallet/wallet-claim.service';
import { walletOwnership } from '@/lib/services/guest-auth/wallet-ownership';
import { HANDLE_PATTERN } from '@/lib/services/wallet/host-wallet-view.service';
import { invoicesToCsv, MAX_EXPORT, parseInvoiceFilters, queryGuestInvoices } from '@/lib/services/guest-auth/guest-bills.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guest/invoices?handle=@name&venue_id=&from=&to=&payment=&order_id=&before=&limit=&format=csv
 *
 * The bills of every venue the device proves it owns the handle for. A handle the device does not
 * own returns an empty list, so ownership can't be probed. order_id returns one invoice if it is
 * the guest's, and nothing otherwise.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const url = new URL(request.url);
  const handle = (url.searchParams.get('handle') || '').trim().toLowerCase();
  if (!HANDLE_PATTERN.test(handle)) {
    return NextResponse.json({ success: false, error: 'A valid guest handle is required.' }, { status: 400 });
  }

  const parsed = parseInvoiceFilters(url.searchParams);
  if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  const csv = url.searchParams.get('format') === 'csv';

  const limited = await enforceRateLimit(request, csv ? 'guest_invoices_csv' : 'guest_invoices', csv ? 10 : 120, 60_000);
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
    const result = await queryGuestInvoices(db, owned, { ...parsed.filters, before: null, limit: MAX_EXPORT });
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(invoicesToCsv(result.invoices), {
      headers: {
        ...headers,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bills-${stamp}.csv"`,
      },
    });
  }

  const result = await queryGuestInvoices(db, owned, parsed.filters);
  return NextResponse.json({ success: true, ...result }, { headers });
}, 'GuestInvoicesGET');
