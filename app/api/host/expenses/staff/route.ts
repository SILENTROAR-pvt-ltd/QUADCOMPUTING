import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { getPayroll } from '@/lib/services/expenses/payroll.service';
import { leavingDate, parseStaff } from '@/lib/services/expenses/staff-input';
import { currentPeriod, isPeriod } from '@/lib/services/expenses/period.util';
import { businessDateString } from '@/lib/utils/business-day';

export const dynamic = 'force-dynamic';
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** The month's payroll (`?period=YYYY-MM`, default this month). */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const p = new URL(request.url).searchParams.get('period');
    const payroll = await getPayroll(auth.supabase, auth.businessId, isPeriod(p) ? p : currentPeriod());
    return NextResponse.json(payroll, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostExpensesStaffGET');
  }
}, 'HostExpensesStaffGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const parsed = parseStaff(await request.json().catch(() => ({})));
    if (!parsed.ok) return bad(parsed.error);
    const { data, error } = await auth.supabase.from('staff_profiles')
      .insert({ ...parsed.value, business_id: auth.businessId, status: 'ACTIVE' }).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, staff: data });
  } catch (error) {
    return handleApiError(error, request, 'HostExpensesStaffPOST');
  }
}, 'HostExpensesStaffPOST');

/** Edits an employee, or with `action: "reactivate"` brings back someone marked as left. */
export const PUT = withApiErrorBoundary(async function PUT(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    if (!body.id) return bad('Missing employee id.');
    const parsed = body.action === 'reactivate' ? { ok: true as const, value: { status: 'ACTIVE', end_date: null } } : parseStaff(body);
    if (!parsed.ok) return bad(parsed.error);
    const { data, error } = await auth.supabase.from('staff_profiles').update(parsed.value)
      .eq('id', body.id).eq('business_id', auth.businessId).select().maybeSingle();
    if (error) throw error;
    if (!data) return bad('That employee no longer exists.', 404);
    return NextResponse.json({ success: true, staff: data });
  } catch (error) {
    return handleApiError(error, request, 'HostExpensesStaffPUT');
  }
}, 'HostExpensesStaffPUT');

// Marks an employee as left (last day today, or `?end_date=`). Their money records stay, and the
// month's salary is pro-rated to the last day.
export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const p = new URL(request.url).searchParams;
    const id = p.get('id');
    if (!id) return bad('Missing employee id.');
    const end = leavingDate(p.get('end_date'), businessDateString());
    const { data, error } = await auth.supabase.from('staff_profiles')
      .update({ status: 'INACTIVE', end_date: end, is_pos_active: false })
      .eq('id', id).eq('business_id', auth.businessId).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return bad('That employee no longer exists.', 404);
    return NextResponse.json({ success: true, end_date: end });
  } catch (error) {
    return handleApiError(error, request, 'HostExpensesStaffDELETE');
  }
}, 'HostExpensesStaffDELETE');
