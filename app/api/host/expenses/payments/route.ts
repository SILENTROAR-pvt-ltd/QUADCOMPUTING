import { masterUnlockRequired } from '@/lib/services/security/master-unlock-guard';
import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { parseMoney, paymentPeriod } from '@/lib/services/expenses/staff-input';
import { getStaffLedger, staffBelongs } from '@/lib/services/expenses/payroll.service';
import { currentPeriod, isPeriod } from '@/lib/services/expenses/period.util';
import { businessDateString } from '@/lib/utils/business-day';

export const dynamic = 'force-dynamic';
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const NEEDS_UPDATE = 'Salary payments need the latest database update (migration 20261010000009).';
const missing = (e: any) => e && ['42P01', 'PGRST205'].includes(e.code);

/** One employee's advances and salary payments for a month (`?staff_id=&period=`). */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const p = new URL(request.url).searchParams;
    const staffId = p.get('staff_id');
    if (!staffId) return bad('Missing employee id.');
    const period = isPeriod(p.get('period')) ? p.get('period')! : currentPeriod();
    return NextResponse.json(await getStaffLedger(auth.supabase, auth.businessId, staffId, period), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostSalaryPaymentsGET');
  }
}, 'HostSalaryPaymentsGET');

/** Records a salary payment for a month; it closes what is still to pay. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const locked = masterUnlockRequired(request, auth);
    if (locked) return locked;
    const body = await request.json().catch(() => ({}));
    const parsed = parseMoney(body, businessDateString());
    if (!parsed.ok) return bad(parsed.error);
    const m = parsed.value;
    if (!(await staffBelongs(auth.supabase, auth.businessId, m.staff_id))) return bad('That employee is not at this venue.', 404);
    const { data, error } = await auth.supabase.from('staff_salary_payments').insert({
      business_id: auth.businessId, staff_id: m.staff_id, period: paymentPeriod(body, m.date),
      amount: m.amount, paid_on: m.date, method: m.method, notes: m.notes,
    }).select().single();
    if (missing(error)) return bad(NEEDS_UPDATE, 503);
    if (error) throw error;
    return NextResponse.json({ success: true, payment: data });
  } catch (error) {
    return handleApiError(error, request, 'HostSalaryPaymentsPOST');
  }
}, 'HostSalaryPaymentsPOST');

/** Removes a salary payment entered by mistake. */
export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const locked = masterUnlockRequired(request, auth);
    if (locked) return locked;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return bad('Missing payment id.');
    const { data, error } = await auth.supabase.from('staff_salary_payments').delete().eq('id', id).eq('business_id', auth.businessId).select('id');
    if (missing(error)) return bad(NEEDS_UPDATE, 503);
    if (error) throw error;
    if (!data?.length) return bad('That payment no longer exists.', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, request, 'HostSalaryPaymentsDELETE');
  }
}, 'HostSalaryPaymentsDELETE');
