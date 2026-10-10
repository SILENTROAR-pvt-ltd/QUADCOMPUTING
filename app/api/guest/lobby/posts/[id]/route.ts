import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess, UUID_REGEX } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { accountForRequest } from '@/lib/services/guest-auth/guest-account.service';
import { supabasePhotoStore } from '@/lib/services/guest-auth/guest-avatar.service';
import { LOBBY_MEDIA_BUCKET } from '@/lib/services/lobby/lobby-post-view';
import { deleteLobbyPost } from '@/lib/services/lobby/lobby-post-write';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** DELETE /api/guest/lobby/posts/:id?cafe_id= — the author removes their own post. */
export const DELETE = withApiErrorBoundary(async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const venue = await validateGuestAccess(url.searchParams.get('cafe_id') || url.searchParams.get('business_id'));
  if (venue.error) return venue.error;
  if (!UUID_REGEX.test(id)) return NextResponse.json({ success: false, error: 'Post not found.' }, { status: 404, headers: NO_STORE });

  const limited = await enforceRateLimit(request, 'guest_lobby_posts_delete', 60, 10 * 60_000, venue.businessId);
  if (limited) return limited;

  const db = adminDb();
  const viewer = await accountForRequest(db, request, venue.businessId);
  if (!viewer) return NextResponse.json({ success: false, error: 'Sign in to remove a post.' }, { status: 401, headers: NO_STORE });

  const result = await deleteLobbyPost(db, supabasePhotoStore(db, LOBBY_MEDIA_BUCKET), viewer.id, venue.businessId, id);
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status, headers: NO_STORE });
  return NextResponse.json({ success: true }, { headers: NO_STORE });
}, 'GuestLobbyPostsDELETE');
