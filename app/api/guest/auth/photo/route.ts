import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { accountForRequest, summarize } from '@/lib/services/guest-auth/guest-account.service';
import { clearGuestPhoto, saveGuestPhoto, supabasePhotoStore } from '@/lib/services/guest-auth/guest-avatar.service';
import { isPhotoType, PHOTO_MAX_BYTES } from '@/lib/guest/avatar-options';

export const dynamic = 'force-dynamic';

const JSON_HEADERS = { 'Cache-Control': 'no-store' };

/** The signed-in account at this venue, or the response that says why not. */
async function signedInAccount(request: Request, venueParam: string | null): Promise<NextResponse | { db: any; account: any }> {
  const validation = await validateGuestAccess(venueParam);
  if (validation.error) return validation.error as NextResponse;
  const limited = await enforceRateLimit(request, 'guest_photo_write', 20, 10 * 60_000, validation.businessId);
  if (limited) return limited;
  const db = adminDb();
  const account = await accountForRequest(db, request, validation.businessId);
  if (!account) {
    return NextResponse.json({ success: false, error: 'Sign in to change your picture.' }, { status: 401, headers: JSON_HEADERS });
  }
  return { db, account };
}

/**
 * POST /api/guest/auth/photo?venue_id= — upload a photo as the raw image body
 * (Content-Type image/jpeg, image/png or image/webp). The image is checked by its bytes.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const url = new URL(request.url);
  const who = await signedInAccount(request, url.searchParams.get('venue_id'));
  if (who instanceof NextResponse) return who;

  const declared = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const declaredPhotoType = isPhotoType(declared) ? declared : undefined;

  const length = Number(request.headers.get('content-length') || 0);
  if (length > PHOTO_MAX_BYTES) {
    return NextResponse.json({ success: false, error: 'That photo is too large. Try a smaller one.' }, { status: 413, headers: JSON_HEADERS });
  }
  const bytes = new Uint8Array(await request.arrayBuffer());

  const result = await saveGuestPhoto(who.db, supabasePhotoStore(who.db), who.account, bytes, declaredPhotoType);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status, headers: JSON_HEADERS });
  }

  return NextResponse.json({ success: true, account: summarize({ ...who.account, photo_path: result.photo_path }) }, { headers: JSON_HEADERS });
}, 'GuestAuthPhotoPost');

/** DELETE /api/guest/auth/photo?venue_id= — remove the photo; the emoji avatar shows again. */
export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  const url = new URL(request.url);
  const who = await signedInAccount(request, url.searchParams.get('venue_id'));
  if (who instanceof NextResponse) return who;

  await clearGuestPhoto(who.db, supabasePhotoStore(who.db), who.account);
  return NextResponse.json({ success: true, account: summarize({ ...who.account, photo_path: null }) }, { headers: JSON_HEADERS });
}, 'GuestAuthPhotoDelete');
