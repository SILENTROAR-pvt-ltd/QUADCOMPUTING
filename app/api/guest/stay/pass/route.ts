import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { guestPassView, loadPassByToken, StayPassError } from '@/lib/services/stay/stay-pass.service';
import { loadStayBusiness } from '@/lib/services/stay/room-route.util';
import { readMenuInfo } from '@/lib/services/menu-info/menu-info';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guest/stay/pass?venue=<slug or id>&p=<token>
 * What the check-in page shows for the link the desk gave the guest: the stay that was paid for, and whether the link
 * can still be used. The phone number and the payment reference are never part of it.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = await validateGuestAccess(searchParams.get('venue'));
    if (validation.error) return validation.error;
    const businessId = validation.businessId;

    const limited = await enforceRateLimit(request, 'stay_pass_view', 30, 10 * 60_000, businessId);
    if (limited) return limited;

    const db = adminDb();
    const pass = await loadPassByToken(db, searchParams.get('p'));
    if (pass.business_id !== businessId) throw new StayPassError('NOT_FOUND', 'This check-in link is not valid. Ask the desk for a new one.');

    const [business, category, room] = await Promise.all([
      loadStayBusiness(db, businessId),
      pass.category_id ? db.from('room_categories').select('name, photos').eq('id', pass.category_id).maybeSingle() : Promise.resolve({ data: null }),
      pass.used_room_id ? db.from('rooms').select('qr_code_hash').eq('id', pass.used_room_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const expired = pass.status === 'issued' && Date.parse(pass.expires_at) < Date.now();
    return NextResponse.json({
      success: true,
      pass: { ...guestPassView(pass), status: expired ? 'expired' : pass.status, room_type: category.data?.name || null, photo: category.data?.photos?.[0] || null },
      // What the venue prints on every tax invoice, so the guest sees the same bill the desk printed.
      venue: {
        id: businessId, name: business?.business_name || business?.name || 'Venue', self_checkin_enabled: Boolean(business?.self_checkin_enabled),
        gstin: business?.gst_number ? String(business.gst_number).toUpperCase() : null, address: readMenuInfo(business?.menu_info).address || null,
      },
      room_code: pass.status === 'used' ? room.data?.qr_code_hash || null : null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof StayPassError) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.code === 'FAILED' ? 500 : 404 });
    return handleApiError(error, request, 'StayPassGET');
  }
}, 'StayPassGET');
