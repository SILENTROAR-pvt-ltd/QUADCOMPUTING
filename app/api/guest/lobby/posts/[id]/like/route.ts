import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess, UUID_REGEX } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { accountForRequest } from '@/lib/services/guest-auth/guest-account.service';
import { toggleLobbyLike } from '@/lib/services/lobby/lobby-engagement';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status, headers: NO_STORE });

/** POST /api/guest/lobby/posts/:id/like?cafe_id= — like a post, or take the like back. */
export const POST = withApiErrorBoundary(async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const venue = await validateGuestAccess(url.searchParams.get('cafe_id') || url.searchParams.get('business_id'));
  if (venue.error) return venue.error;
  if (!UUID_REGEX.test(id)) return fail('Post not found.', 404);

  const limited = await enforceRateLimit(request, 'guest_lobby_like', 120, 10 * 60_000, venue.businessId);
  if (limited) return limited;

  const db = adminDb();
  const viewer = await accountForRequest(db, request, venue.businessId);
  if (!viewer) return fail('Sign in to like a post.', 401);

  const result = await toggleLobbyLike(db, viewer.id, venue.businessId, id);
  if (!result.ok) return fail(result.error, result.status);
  return NextResponse.json({ success: true, ...result.value }, { headers: NO_STORE });
}, 'GuestLobbyLikePOST');
