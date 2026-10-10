import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { parseBill } from '@/lib/services/expenses/bills.util';
import { getBills, saveBill } from '@/lib/services/expenses/bills.service';
import { currentPeriod, isPeriod } from '@/lib/services/expenses/period.util';
import { businessDateString } from '@/lib/utils/business-day';

export const dynamic = 'force-dynamic';
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** The month's bills (`?period=YYYY-MM`), totals by status and category, and repeating bills due. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const p = new URL(request.url).searchParams.get('period');
    const result = await getBills(auth.supabase, auth.businessId, isPeriod(p) ? p : currentPeriod(), businessDateString());
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostExpensesBillsGET');
  }
}, 'HostExpensesBillsGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const parsed = parseBill(await request.json().catch(() => ({})), businessDateString());
    if (!parsed.ok) return bad(parsed.error);
    return NextResponse.json({ success: true, expense: await saveBill(auth.supabase, auth.businessId, parsed.value) });
  } catch (error) {
    return handleApiError(error, request, 'HostExpensesBillsPOST');
  }
}, 'HostExpensesBillsPOST');

/** Edits a bill, or with `action: "mark_paid"` settles a pending one (method and date optional). */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    if (!body.id) return bad('Missing bill id.');
    const today = businessDateString();
    let values: Record<string, unknown>;
    if (body.action === 'mark_paid') {
      const method = String(body.payment_method || '').toUpperCase();
      values = { status: 'PAID', paid_on: today, payment_method: ['CASH', 'UPI', 'BANK', 'CARD', 'CHEQUE'].includes(method) ? method : null };
    } else {
      const parsed = parseBill(body, today);
      if (!parsed.ok) return bad(parsed.error);
      values = parsed.value;
    }
    const saved = await saveBill(auth.supabase, auth.businessId, values, body.id);
    if (!saved) return bad('That bill no longer exists.', 404);
    return NextResponse.json({ success: true, expense: saved });
  } catch (error) {
    return handleApiError(error, request, 'HostExpensesBillsPATCH');
  }
}, 'HostExpensesBillsPATCH');

export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return bad('Missing bill id.');
    const { data, error } = await auth.supabase.from('operational_expenses').delete().eq('id', id).eq('business_id', auth.businessId).select('id');
    if (error) throw error;
    if (!data?.length) return bad('That bill no longer exists.', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, request, 'HostExpensesBillsDELETE');
  }
}, 'HostExpensesBillsDELETE');
