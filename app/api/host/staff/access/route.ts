import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { parseNewStaff, parseStaffChange } from '@/lib/services/staff-auth/staff-access-input';
import { hashStaffPin } from '@/lib/services/staff-auth/staff-login.service';
import { asStaffRole } from '@/lib/services/staff-auth/staff-roles';
import { businessDateString } from '@/lib/utils/business-day';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };
const bad = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status, headers: NO_STORE });

/** A migration that has not been applied shows up as a missing column; say so instead of a bare error. */
function dbProblem(error: any) {
  const missing = error?.code === '42703' || error?.code === 'PGRST204' || /pin_hash|pin_failures|pin_locked_until/i.test(String(error?.message || ''));
  return missing
    ? bad('Staff PIN sign-in needs one database update first (migration 20261016000003_staff_pin_login.sql).', 409)
    : bad('That could not be saved. Please try again.', 500);
}

/** GET /api/host/staff/access — the venue's staff with their role, whether they have a PIN, and the sign-in link. Owner only. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    // Removed staff (status INACTIVE, last day set) stay in payroll history but are not listed here.
    const { data, error } = await adminDb().from('staff_profiles')
      .select('id, name, role, status, is_pos_active, pin_hash, last_login_at').eq('business_id', auth.businessId)
      .or('status.is.null,status.neq.INACTIVE').order('name');
    if (error) return dbProblem(error);
    const staff = (data || []).map((r: any) => ({
      id: r.id, name: r.name, role: asStaffRole(r.role), active: r.is_pos_active !== false && String(r.status || 'ACTIVE').toUpperCase() !== 'INACTIVE',
      hasPin: Boolean(r.pin_hash), lastLoginAt: r.last_login_at ?? null,
    }));
    return NextResponse.json({ success: true, businessId: auth.businessId, staff }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostStaffAccessGET');
  }
}, 'HostStaffAccessGET');

/** POST /api/host/staff/access { name, role, pin } — adds a staff member who can sign in with a PIN. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const parsed = parseNewStaff(await request.json().catch(() => ({})));
    if (!parsed.ok) return bad(parsed.error);
    const { name, role, pin } = parsed.value;
    const { data, error } = await adminDb().from('staff_profiles').insert({
      business_id: auth.businessId, name, role, pin_hash: await hashStaffPin(pin), is_pos_active: true,
      status: 'ACTIVE', join_date: businessDateString(), base_salary: 0,
    }).select('id, name, role').single();
    if (error) return dbProblem(error);
    return NextResponse.json({ success: true, staff: data }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostStaffAccessPOST');
  }
}, 'HostStaffAccessPOST');

/** PUT /api/host/staff/access { id, name?, role?, pin?, active? } — changes one staff member. A new PIN also clears any lock. */
export const PUT = withApiErrorBoundary(async function PUT(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const parsed = parseStaffChange(await request.json().catch(() => ({})));
    if (!parsed.ok) return bad(parsed.error);
    const c = parsed.value;
    const patch: Record<string, unknown> = {};
    if (c.name !== undefined) patch.name = c.name;
    if (c.role !== undefined) patch.role = c.role;
    if (c.active !== undefined) patch.is_pos_active = c.active;
    if (c.pin !== undefined) Object.assign(patch, { pin_hash: await hashStaffPin(c.pin), pin_failures: 0, pin_locked_until: null });
    // A PIN, role or active change ends every session already issued to this staff member.
    if (c.pin !== undefined || c.role !== undefined || c.active !== undefined) {
      const { data: current } = await adminDb().from('staff_profiles').select('session_version')
        .eq('id', c.id).eq('business_id', auth.businessId).maybeSingle();
      patch.session_version = Number(current?.session_version ?? 0) + 1;
    }
    const { data, error } = await adminDb().from('staff_profiles').update(patch)
      .eq('id', c.id).eq('business_id', auth.businessId).select('id').maybeSingle();
    if (error) return dbProblem(error);
    if (!data) return bad('That staff member no longer exists.', 404);
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostStaffAccessPUT');
  }
}, 'HostStaffAccessPUT');

/**
 * DELETE /api/host/staff/access?id= — removes a staff member: they can no longer sign in and drop off this list.
 * Their pay, advances and the orders they served stay on record, so the row is marked as left rather than erased.
 */
export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return bad('Missing staff member.');
    const { data, error } = await adminDb().from('staff_profiles')
      .update({ status: 'INACTIVE', end_date: businessDateString(), is_pos_active: false, pin_hash: null, pin_failures: 0, pin_locked_until: null })
      .eq('id', id).eq('business_id', auth.businessId).select('id').maybeSingle();
    if (error) return dbProblem(error);
    if (!data) return bad('That staff member no longer exists.', 404);
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostStaffAccessDELETE');
  }
}, 'HostStaffAccessDELETE');
