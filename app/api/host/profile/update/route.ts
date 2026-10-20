import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { parseProfile } from '@/lib/services/profile/profile-input';
import { saveProfile } from '@/lib/services/profile/save-profile.service';
import { hasMasterUnlock, masterUnlockFromCookieHeader } from '@/lib/services/security/master-unlock';
import { isPinSet } from '@/lib/services/security/venue-pin';
import { loadPinRow } from '@/lib/services/security/venue-pin.service';

export const dynamic = 'force-dynamic';

/**
 * Saves the host's profile: owner, venue type and legal details, address, banking and which
 * sections the master PIN locks. PINs have their own endpoint (/api/host/security/pin).
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    // A venue with a master PIN keeps its banking and profile details behind it. The owner must have unlocked this session on the server.
    const pinRow = await loadPinRow(auth.businessId);
    if (isPinSet(pinRow, 'admin') && !hasMasterUnlock(masterUnlockFromCookieHeader(request.headers.get('cookie')), auth.user.id, auth.businessId)) {
      return NextResponse.json({ success: false, error: 'Enter the master PIN to change these details.', code: 'MASTER_UNLOCK_REQUIRED' }, { status: 403 });
    }
    const parsed = parseProfile(await request.json().catch(() => ({})));
    if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error, field: parsed.field }, { status: 400 });

    const r = await saveProfile(auth.supabase, auth.user.id, auth.businessId, parsed.value);
    if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: r.status });
    return NextResponse.json({
      success: true,
      needs_update: r.needsUpdate,
      venueTypes: parsed.value.venueTypes,
      offersAccommodation: parsed.value.offersAccommodation,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostProfileUpdatePOST');
  }
}, 'HostProfileUpdatePOST');
