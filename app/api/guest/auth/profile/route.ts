import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { accountForRequest, summarize, updateGuestProfile } from '@/lib/services/guest-auth/guest-account.service';
import { supabasePhotoStore } from '@/lib/services/guest-auth/guest-avatar.service';

export const dynamic = 'force-dynamic';

/** PATCH /api/guest/auth/profile — edit the signed-in guest's name, traveller type and intro at this venue. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const validation = await validateGuestAccess(body?.venue_id || body?.business_id || body?.cafe_id);
  if (validation.error) return validation.error;

  const limited = await enforceRateLimit(request, 'guest_profile_edit', 30, 10 * 60_000, validation.businessId);
  if (limited) return limited;

  const db = adminDb();
  const account = await accountForRequest(db, request, validation.businessId);
  if (!account) {
    return NextResponse.json({ success: false, error: 'Sign in to edit your profile.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const result = await updateGuestProfile(db, account, {
    name: body?.name,
    traveller_type: body?.traveller_type,
    intro: body?.intro,
    avatar: body?.avatar,
  });
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
  }
  // Choosing an emoji replaced the photo; the file is removed only after the change is saved.
  if (result.removed_photo_path) {
    await supabasePhotoStore(db).remove([result.removed_photo_path]).catch(() => {});
  }

  return NextResponse.json({ success: true, account: summarize(result.account) }, { headers: { 'Cache-Control': 'no-store' } });
}, 'GuestAuthProfilePatch');
