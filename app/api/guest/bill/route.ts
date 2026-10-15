import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { loadSettledOrderBill } from '@/lib/services/guest-auth/guest-bills.service';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET /api/guest/bill?cafe_id=&table=&order_id= — the bill the venue generated for the order this device took part in, once
 * it is settled: the same invoice the host's receipt shows (items, discount, GST, invoice number). The order id is the proof:
 * without the right one for this venue and table, the answer is "not found", so nobody can read another party's bill.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validation = await validateGuestAccess(searchParams.get('cafe_id') || searchParams.get('venue_id'), searchParams.get('table') || searchParams.get('table_number'));
  if (validation.error) return validation.error;

  const limited = await enforceRateLimit(request, 'guest_bill_get', 120, 60_000, validation.businessId);
  if (limited) return limited;

  const bill = await loadSettledOrderBill(adminDb(), validation.businessId, String(searchParams.get('order_id') || ''), validation.tableNumber || '');
  if (!bill) return NextResponse.json({ success: false, error: 'We could not find that bill. It may be older than two days.' }, { status: 404, headers: noStore });
  return NextResponse.json({ success: true, bill }, { headers: noStore });
}, 'GuestBillGET');
