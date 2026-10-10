import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WINDOW_HOURS = 12;

/**
 * GET /api/host/notifications
 * Pending guest calls (waiter / chef / bill / service requests) and system
 * alerts for this venue. Guests have always been able to raise these
 * (POST /api/guest/call-staff) but no host screen read them, so every
 * "Call Waiter" went unanswered.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;

    const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();
    const { data, error } = await adminDb()
      .from('staff_notifications')
      .select('id, table_number, notification_type, message, status, created_at')
      .eq('business_id', auth.businessId)
      .eq('status', 'PENDING')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    return NextResponse.json({ success: true, notifications: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return handleApiError(error, request, 'HostNotificationsGET');
  }
}, 'HostNotificationsGET');

/**
 * PATCH /api/host/notifications  { id } | { all: true }
 * Marks alerts as handled. Always scoped to the host's own venue.
 */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    let query = adminDb()
      .from('staff_notifications')
      .update({ status: 'RESOLVED' })
      .eq('business_id', auth.businessId)
      .eq('status', 'PENDING');

    if (body?.all === true) {
      // resolve every pending alert for this venue
    } else if (typeof body?.id === 'string' && UUID_REGEX.test(body.id)) {
      query = query.eq('id', body.id);
    } else {
      return NextResponse.json({ success: false, error: 'Provide an alert id or all: true' }, { status: 400 });
    }

    const { data, error } = await query.select('id');
    if (error) throw error;
    return NextResponse.json({ success: true, resolved: (data || []).length });
  } catch (error: any) {
    return handleApiError(error, request, 'HostNotificationsPATCH');
  }
}, 'HostNotificationsPATCH');
