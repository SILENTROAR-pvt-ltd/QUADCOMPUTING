import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { accountForRequest } from '@/lib/services/guest-auth/guest-account.service';
import { supabasePhotoStore } from '@/lib/services/guest-auth/guest-avatar.service';
import { LOBBY_MEDIA_BUCKET } from '@/lib/services/lobby/lobby-post-view';
import { listLobbyPosts, safeSearch } from '@/lib/services/lobby/lobby-post-query';
import { createLobbyPost } from '@/lib/services/lobby/lobby-post-write';
import { isLobbyKind, LOBBY_MEDIA_MAX_BYTES, lobbyPageLimit } from '@/lib/guest/lobby-rules';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status, headers: NO_STORE });

/** GET /api/guest/lobby/posts?cafe_id=&kind=&mine=1&q=&before=&limit= — the venue's lobby feed. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const url = new URL(request.url);
  const venue = await validateGuestAccess(url.searchParams.get('cafe_id') || url.searchParams.get('business_id'));
  if (venue.error) return venue.error;

  const limited = await enforceRateLimit(request, 'guest_lobby_posts_get', 300, 60_000, venue.businessId);
  if (limited) return limited;

  const kindParam = url.searchParams.get('kind') || 'all';
  if (kindParam !== 'all' && !isLobbyKind(kindParam)) return fail('Unknown lobby filter.', 400);

  const rawSearch = url.searchParams.get('q');
  const search = rawSearch ? safeSearch(rawSearch) : null;
  if (rawSearch && !search) return fail('Search can use letters, numbers and . , ! ? @ # - ₹ only.', 400);

  const before = url.searchParams.get('before');
  if (before && Number.isNaN(Date.parse(before))) return fail('before must be a timestamp.', 400);

  const db = adminDb();
  const viewer = await accountForRequest(db, request, venue.businessId);
  const page = await listLobbyPosts(db, venue.businessId, {
    kind: kindParam === 'all' ? 'all' : kindParam,
    mine: url.searchParams.get('mine') === '1',
    search,
    before,
    limit: lobbyPageLimit(url.searchParams.get('limit')),
    viewerId: viewer?.id ?? null,
  });
  return NextResponse.json({ success: true, ...page }, { headers: NO_STORE });
}, 'GuestLobbyPostsGET');

/** POST /api/guest/lobby/posts?cafe_id= — share a message, moment or want. Multipart: kind, content, table, photo. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const url = new URL(request.url);
  const venue = await validateGuestAccess(url.searchParams.get('cafe_id') || url.searchParams.get('business_id'));
  if (venue.error) return venue.error;

  const limited = await enforceRateLimit(request, 'guest_lobby_posts_post', 20, 10 * 60_000, venue.businessId);
  if (limited) return limited;

  const db = adminDb();
  const author = await accountForRequest(db, request, venue.businessId);
  if (!author) return fail('Sign in to share with the lobby.', 401);

  if (Number(request.headers.get('content-length') || 0) > LOBBY_MEDIA_MAX_BYTES + 64 * 1024) {
    return fail('That photo is too large. Try a smaller one.', 413);
  }

  const form = await request.formData();
  const photo = form.get('photo');
  const media = photo instanceof File ? new Uint8Array(await photo.arrayBuffer()) : null;

  const result = await createLobbyPost(db, supabasePhotoStore(db, LOBBY_MEDIA_BUCKET), author, venue.businessId, {
    kind: form.get('kind'),
    content: form.get('content'),
    table: form.get('table'),
    media,
  });
  if (!result.ok) return fail(result.error, result.status);
  return NextResponse.json({ success: true, post: result.value }, { headers: NO_STORE });
}, 'GuestLobbyPostsPOST');
