import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { masterUnlockRequired } from '@/lib/services/security/master-unlock-guard';

export const dynamic = 'force-dynamic';

const COLUMNS = 'self_checkin_enabled, in_room_dining_enabled, stay_tagline, checkin_time, checkout_time, slug';
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** GET: the venue's stay switches (self check-in, in-room dining) and the showcase tagline. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;
    const { data, error } = await supabase.from('businesses').select(COLUMNS).eq('id', businessId).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ success: true, settings: data || {} }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostStaySettingsGET');
  }
}, 'HostStaySettingsGET');

/**
 * PATCH: change the switches. Behind the master PIN: turning self check-in on lets anyone at the property take a
 * vacant room, so it is the owner's decision, not a cashier's.
 */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const locked = masterUnlockRequired(request, auth);
    if (locked) return locked;
    if (auth.staff) return NextResponse.json({ success: false, error: 'Only the owner changes stay settings.' }, { status: 403 });
    const { businessId, supabase } = auth;

    const body = await request.json().catch(() => ({}));
    const update: Record<string, unknown> = {};
    if (typeof body.self_checkin_enabled === 'boolean') update.self_checkin_enabled = body.self_checkin_enabled;
    if (typeof body.in_room_dining_enabled === 'boolean') update.in_room_dining_enabled = body.in_room_dining_enabled;
    if (typeof body.stay_tagline === 'string') update.stay_tagline = body.stay_tagline.replace(/\s+/g, ' ').trim().slice(0, 120) || null;
    for (const k of ['checkin_time', 'checkout_time'] as const) {
      if (typeof body[k] === 'string') {
        if (!HHMM.test(body[k])) return NextResponse.json({ success: false, error: `${k === 'checkin_time' ? 'Check-in' : 'Check-out'} time must be HH:MM.` }, { status: 400 });
        update[k] = body[k];
      }
    }
    if (Object.keys(update).length === 0) return NextResponse.json({ success: false, error: 'Nothing to change.' }, { status: 400 });

    const { data, error } = await supabase.from('businesses').update(update).eq('id', businessId).select(COLUMNS).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    return handleApiError(error, request, 'HostStaySettingsPATCH');
  }
}, 'HostStaySettingsPATCH');
