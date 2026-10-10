import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess, UUID_REGEX } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { accountForRequest } from '@/lib/services/guest-auth/guest-account.service';
import { loadDishLikes, toggleDishLike } from '@/lib/services/guest-menu/dish-likes.service';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status, headers: NO_STORE });
const venueParam = (url: URL) => url.searchParams.get('cafe_id') || url.searchParams.get('business_id');

/** GET /api/guest/menu/likes?cafe_id= — like counts for the venue's dishes, and which ones this guest likes. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const venue = await validateGuestAccess(venueParam(new URL(request.url)));
  if (venue.error) return venue.error;
  const db = adminDb();
  const viewer = await accountForRequest(db, request, venue.businessId);
  const likes = await loadDishLikes(db, venue.businessId, viewer?.id ?? null);
  return NextResponse.json({ success: true, signedIn: Boolean(viewer), ...likes }, { headers: NO_STORE });
}, 'GuestMenuLikesGET');

/** POST /api/guest/menu/likes?cafe_id= { item_id } — like a dish, or take the like back. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const venue = await validateGuestAccess(venueParam(new URL(request.url)));
  if (venue.error) return venue.error;

  const limited = await enforceRateLimit(request, 'guest_dish_like', 120, 10 * 60_000, venue.businessId);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const itemId = typeof body?.item_id === 'string' ? body.item_id : '';
  if (!UUID_REGEX.test(itemId)) return fail('That dish is not on this menu.', 404);

  const db = adminDb();
  const viewer = await accountForRequest(db, request, venue.businessId);
  if (!viewer) return fail('Sign in to save the dishes you love.', 401);

  const result = await toggleDishLike(db, viewer.id, venue.businessId, itemId);
  if (!result.ok) return fail(result.error, result.status);
  return NextResponse.json({ success: true, ...result.value }, { headers: NO_STORE });
}, 'GuestMenuLikesPOST');
