import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { parseProfile } from '@/lib/services/profile/profile-input';
import { saveProfile } from '@/lib/services/profile/save-profile.service';

export const dynamic = 'force-dynamic';

/**
 * Saves the host's profile: owner, venue type and legal details, address, banking and which
 * sections the master PIN locks. PINs have their own endpoint (/api/host/security/pin).
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
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
