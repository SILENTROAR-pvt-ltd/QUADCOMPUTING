import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { parseMoney } from '@/lib/services/expenses/staff-input';
import { staffBelongs } from '@/lib/services/expenses/payroll.service';
import { businessDateString } from '@/lib/utils/business-day';

export const dynamic = 'force-dynamic';
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** An advance against an employee's salary; it comes off what is still to pay that month. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const parsed = parseMoney({ ...body, date: body.date ?? body.date_given }, businessDateString());
    if (!parsed.ok) return bad(parsed.error);
    const m = parsed.value;
    if (!(await staffBelongs(auth.supabase, auth.businessId, m.staff_id, true))) return bad('That employee is not active at this venue.', 404);

    const row = { business_id: auth.businessId, staff_id: m.staff_id, amount: m.amount, date_given: m.date, notes: m.notes, method: m.method };
    let res = await auth.supabase.from('staff_advances').insert(row).select().single();
    if (res.error?.code === '42703' || res.error?.code === 'PGRST204') {
      const { method: _method, ...legacy } = row; // before migration 20261010000009 there is no method column
      res = await auth.supabase.from('staff_advances').insert(legacy).select().single();
    }
    if (res.error) throw res.error;
    return NextResponse.json({ success: true, advance: res.data });
  } catch (error) {
    return handleApiError(error, request, 'HostExpensesAdvancesPOST');
  }
}, 'HostExpensesAdvancesPOST');

/** Removes an advance entered by mistake. */
export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return bad('Missing advance id.');
    const { data, error } = await auth.supabase.from('staff_advances').delete().eq('id', id).eq('business_id', auth.businessId).select('id');
    if (error) throw error;
    if (!data?.length) return bad('That advance no longer exists.', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, request, 'HostExpensesAdvancesDELETE');
  }
}, 'HostExpensesAdvancesDELETE');
