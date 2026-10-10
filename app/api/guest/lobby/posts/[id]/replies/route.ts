import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess, UUID_REGEX } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { accountForRequest } from '@/lib/services/guest-auth/guest-account.service';
import { addReply, listReplies } from '@/lib/services/lobby/lobby-replies';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status, headers: NO_STORE });

type Params = { params: Promise<{ id: string }> };

/** GET /api/guest/lobby/posts/:id/replies?cafe_id= — the replies under a post, oldest first. */
export const GET = withApiErrorBoundary(async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  const venue = await validateGuestAccess(url.searchParams.get('cafe_id') || url.searchParams.get('business_id'));
  if (venue.error) return venue.error;
  if (!UUID_REGEX.test(id)) return fail('Post not found.', 404);

  const limited = await enforceRateLimit(request, 'guest_lobby_replies_get', 300, 60_000, venue.businessId);
  if (limited) return limited;

  const db = adminDb();
  const viewer = await accountForRequest(db, request, venue.businessId);
  const result = await listReplies(db, venue.businessId, viewer?.id ?? null, id);
  if (!result.ok) return fail(result.error, result.status);
  return NextResponse.json({ success: true, replies: result.value }, { headers: NO_STORE });
}, 'GuestLobbyRepliesGET');

/** POST /api/guest/lobby/posts/:id/replies?cafe_id= — reply under a post. Body: { content }. */
export const POST = withApiErrorBoundary(async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  const venue = await validateGuestAccess(url.searchParams.get('cafe_id') || url.searchParams.get('business_id'));
  if (venue.error) return venue.error;
  if (!UUID_REGEX.test(id)) return fail('Post not found.', 404);

  const limited = await enforceRateLimit(request, 'guest_lobby_reply', 30, 10 * 60_000, venue.businessId);
  if (limited) return limited;

  const db = adminDb();
  const author = await accountForRequest(db, request, venue.businessId);
  if (!author) return fail('Sign in to reply.', 401);

  const body = await request.json().catch(() => ({}));
  const result = await addReply(db, author, venue.businessId, id, body?.content);
  if (!result.ok) return fail(result.error, result.status);
  return NextResponse.json({ success: true, reply: result.value }, { headers: NO_STORE });
}, 'GuestLobbyRepliesPOST');
