import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { hostPassView } from '@/lib/services/stay/host-pass-view';
import { issuePass, resolveStay, StayPassError, type PassRow } from '@/lib/services/stay/stay-pass.service';
import { readPolicies } from '@/lib/services/stay/stay-policy';
import { chargeBillFee } from '@/lib/services/wallet/bill-fee';
import { recordStayVisit } from '@/lib/services/live-events/stay-visit';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, number> = { INVALID: 400, NOT_FOUND: 404, CONFLICT: 409, FAILED: 500, USED: 409, VOID: 410, EXPIRED: 410 };

async function venueOf(db: any, businessId: string) {
  const { data, error } = await db.from('businesses').select('slug, stay_policies').eq('id', businessId).maybeSingle();
  if (error) throw error;
  return { venue: data?.slug || businessId, policies: readPolicies(data?.stay_policies) };
}

/** GET /api/host/accommodations/passes?booking_id=<id>: the pass billed for a booking, with its link (or the venue's latest open passes). */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;
    const db = adminDb();
    const { venue } = await venueOf(db, businessId);
    const bookingId = new URL(request.url).searchParams.get('booking_id');

    let q = db.from('stay_passes').select('*').eq('business_id', businessId).neq('status', 'void');
    q = bookingId ? q.eq('booking_id', bookingId) : q.eq('status', 'issued');
    const { data, error } = await q.order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    const origin = new URL(request.url).origin;
    return NextResponse.json({ success: true, passes: (data as PassRow[] || []).map((p) => hostPassView(p, origin, venue)) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostPassesGET');
  }
}, 'HostPassesGET');

/**
 * POST /api/host/accommodations/passes
 * { preview: true, booking_id | category_id + check_out + guest_name + guest_phone + guests, early_option_id? }
 *   answers with what the room would cost, computed here from the room type's rate and the owner's early check-in fees.
 * { ...same, payment_method, payment_reference, idempotency_key }
 *   the guest has paid (direct UPI, cash or card; the desk has confirmed receipt): the advance bill is written as
 *   settled and the pass is issued; the answer carries the check-in link for the guest.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;
    const body = await request.json().catch(() => ({}));
    const db = adminDb();
    const { venue, policies } = await venueOf(db, businessId);

    const req = {
      bookingId: typeof body.booking_id === 'string' ? body.booking_id : null,
      categoryId: typeof body.category_id === 'string' ? body.category_id : null,
      checkOut: typeof body.check_out === 'string' ? body.check_out : null,
      guestName: body.guest_name, guestPhone: body.guest_phone, guestEmail: body.guest_email || null, guests: Number(body.guests) || 1,
      earlyOptionId: body.early_option_id === undefined ? undefined : (body.early_option_id || null),
    };

    if (body.preview) {
      const r = await resolveStay(db, businessId, req, policies);
      return NextResponse.json({ success: true, quote: r.quote, guest: r.guest, check_in: r.checkIn, check_out: r.checkOut, early_option_id: r.early?.id || null, category: r.category.name }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const who = (auth as any).staff?.name || (auth as any).staff?.id || 'owner';
    const out = await issuePass(db, businessId, { ...req, paymentMethod: body.payment_method, paymentReference: body.payment_reference, cashTendered: body.cash_tendered, idempotencyKey: body.idempotency_key, issuedBy: String(who).slice(0, 60) }, { policies });
    // The advance bill is a settled bill: it carries the platform fee like every other, and is the guest's first visit
    // of the stay in My Guests.
    if (!out.reused) {
      chargeBillFee(businessId, out.pass.bill_order_id, auth.supabase);
      recordStayVisit(businessId, out.pass.bill_order_id, { phone: out.pass.guest_phone, email: out.pass.guest_email, name: out.pass.guest_name }, Number(out.pass.amount) || 0, out.pass.paid_at);
    }
    return NextResponse.json({ success: true, reused: out.reused, quote: out.quote, pass: hostPassView(out.pass, new URL(request.url).origin, venue) }, { status: out.reused ? 200 : 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof StayPassError) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: STATUS[error.code] || 500 });
    return handleApiError(error, request, 'HostPassesPOST');
  }
}, 'HostPassesPOST');
