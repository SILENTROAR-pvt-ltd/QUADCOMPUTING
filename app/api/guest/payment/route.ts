import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { apiError } from '@/lib/utils/api-response';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { applyRequestIdentity } from '@/lib/services/guest-auth/request-identity';
import { getGuestWallet } from '@/lib/services/wallet/cashback.service';
import { recordStaffCall } from '@/lib/services/guest/staff-call.service';
import { parseMethod } from '@/lib/services/payments/bill-payment.rules';
import { choosePayment, claimPayment, findLatestStatus, findLivePayment, isTableMissing, openBillForTable, paidForOrder } from '@/lib/services/payments/bill-payment.service';

export const dynamic = 'force-dynamic';

const NOT_READY = { success: false, code: 'PAYMENTS_NOT_READY', error: 'Payments are not set up for this venue yet.' };

/** The venue's UPI handle and the name guests see in their UPI app. Null when the host has not saved a UPI ID. */
async function venueUpi(db: any, businessId: string) {
  const { data } = await db.from('businesses').select('upi_id, business_name, name').eq('id', businessId).maybeSingle();
  const upiId = typeof data?.upi_id === 'string' && data.upi_id.includes('@') ? data.upi_id.trim() : null;
  return { upiId, payee: String(data?.business_name || data?.name || 'Venue') };
}

/**
 * What a guest's phone needs to pay by UPI: the venue's UPI ID and the name shown in their UPI app. The phone builds the pay
 * link itself, so the pay screen can open at once instead of waiting for the server.
 */
function upiBlock(upi: { upiId: string | null; payee: string }) {
  if (!upi.upiId) return { available: false };
  return { available: true, payee: upi.payee, vpa: upi.upiId };
}

/**
 * GET /api/guest/payment?cafe_id=&table=
 * Where this table's payment stands, and whether UPI is possible at this venue. The pay link is only returned while a UPI
 * payment is live.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = await validateGuestAccess(searchParams.get('cafe_id') || searchParams.get('business_id'), searchParams.get('table') || searchParams.get('table_number'));
    if (validation.error) return validation.error;
    const businessId = validation.businessId as string;
    const tableNumber = validation.tableNumber as string;
    const limited = await enforceRateLimit(request, 'guest_payment_get', 1500, 60_000, businessId);
    if (limited) return limited;

    const db = adminDb();
    const [live, upi, bill, lastStatus] = await Promise.all([
      findLivePayment(db, businessId, tableNumber),
      venueUpi(db, businessId),
      openBillForTable(db, businessId, tableNumber),
      findLatestStatus(db, businessId, tableNumber),
    ]);
    if (live.missing) return NextResponse.json({ success: true, ready: false, payment: null, upi: { available: false }, bill_total: bill?.total ?? 0, paid_so_far: 0, last_status: null });

    // What has already been paid and confirmed on this bill: when the guest adds to the order, only the new part is due.
    const paidSoFar = await paidForOrder(db, businessId, bill?.orderId ?? live.payment?.order_id ?? null);
    return NextResponse.json(
      { success: true, ready: true, payment: live.payment, upi: upiBlock(upi), bill_total: bill?.total ?? 0, paid_so_far: paidSoFar, last_status: lastStatus },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: any) {
    return handleApiError(error, request, 'GuestPaymentGET');
  }
}, 'GuestPaymentGET');

/**
 * POST /api/guest/payment  { cafe_id, table_number, method, wallet_amount? }
 * The guest chooses UPI, cash or card for the bill they asked for. The amount comes from the open order here, not from the phone.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const validation = await validateGuestAccess(body?.cafe_id || body?.business_id, body?.table_number);
    if (validation.error) return validation.error;
    const businessId = validation.businessId as string;
    const tableNumber = validation.tableNumber as string;
    const limited = await enforceRateLimit(request, 'guest_payment_post', 120, 60_000, businessId);
    if (limited) return limited;

    const method = parseMethod(body?.method);
    if (!method) return apiError('Choose UPI, cash or card.', 'INVALID_METHOD', 400);

    const db = adminDb();
    const bill = await openBillForTable(db, businessId, tableNumber, typeof body?.session_id === 'string' ? body.session_id : null);
    if (!bill || bill.total <= 0) return apiError('There is no open bill for this table.', 'NO_OPEN_BILL', 409);

    const upi = await venueUpi(db, businessId);
    if (method === 'UPI' && !upi.upiId) return apiError('This venue has not set up UPI yet. Please pay by cash or card.', 'UPI_NOT_AVAILABLE', 409);

    // Only a signed-in guest can set a wallet aside, and never more than they actually have.
    const identity: Record<string, any> = {};
    await applyRequestIdentity(db, request, businessId, identity, { name: 'guest_name', phone: 'guest_phone' });
    const handle = typeof identity.guest_handle === 'string' ? identity.guest_handle : null;
    let walletAmount = 0;
    if (handle && Number(body?.wallet_amount) > 0) {
      try {
        const w: any = await getGuestWallet(db, handle, businessId);
        walletAmount = Math.min(Number(body.wallet_amount) || 0, Number(w?.wallet?.balance) || 0);
      } catch {
        walletAmount = 0; // not knowing the balance means the guest pays the whole bill: never an under-payment
      }
    }

    const result = await choosePayment(db, {
      businessId, tableNumber, method, total: bill.total, walletAmount, orderId: bill.orderId, sessionId: bill.sessionId, guestHandle: handle,
    });
    if (result.missing || !result.payment) return NextResponse.json(NOT_READY);

    const payment = result.payment;
    return NextResponse.json({ success: true, payment, upi: upiBlock(upi) });
  } catch (error: any) {
    if (isTableMissing(error)) return NextResponse.json(NOT_READY);
    return handleApiError(error, request, 'GuestPaymentPOST');
  }
}, 'GuestPaymentPOST');

/**
 * PATCH /api/guest/payment  { cafe_id, table_number, id }
 * "I have paid": the waiter is told to check the guest's screen and confirm.
 */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const validation = await validateGuestAccess(body?.cafe_id || body?.business_id, body?.table_number);
    if (validation.error) return validation.error;
    const businessId = validation.businessId as string;
    const tableNumber = validation.tableNumber as string;
    const limited = await enforceRateLimit(request, 'guest_payment_patch', 120, 60_000, businessId);
    if (limited) return limited;

    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return apiError('Missing payment.', 'INVALID_PARAMS', 400);

    const db = adminDb();
    const live = await findLivePayment(db, businessId, tableNumber);
    if (live.missing) return NextResponse.json(NOT_READY);
    // Only this table's own live payment can be claimed, so an id from another table does nothing.
    if (!live.payment || live.payment.id !== id) return apiError('That payment is no longer open.', 'NOT_FOUND', 404);
    if (live.payment.status !== 'chosen') return NextResponse.json({ success: true, payment: live.payment });

    const claimed = await claimPayment(db, businessId, id);
    const payment = claimed ?? live.payment;

    // The waiter's bell: "table T-04 paid by UPI, please check and confirm". Not fatal if the note cannot be written.
    const amount = Number(payment.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    await recordStaffCall(db, { businessId, tableNumber, type: 'BILL', message: `Paid ₹${amount} by UPI. Please check their screen and confirm.` }).catch(() => null);

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    if (isTableMissing(error)) return NextResponse.json(NOT_READY);
    return handleApiError(error, request, 'GuestPaymentPATCH');
  }
}, 'GuestPaymentPATCH');
