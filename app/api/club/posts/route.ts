import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok, query, readBody } from '@/lib/club/http';
import { requireMember, staffRole } from '@/lib/club/auth';
import { createPost, listPosts } from '@/lib/club/room/posts.service';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pick = (value: string | null) => (value && UUID.test(value) ? value : null);

/**
 * GET /api/club/posts?region=&place=&q=&sort=new|top|following&before=&author= — the Common Room feed.
 * `sort=following` shows only people you follow (and you); `place` shows one place's posts.
 */
export const GET = clubApi('Posts', async (request) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const params = query(request);
  const before = params.get('before');
  const sort = params.get('sort');
  const feed = await listPosts(db, user.id, {
    region: params.get('region'), q: params.get('q'), sort: sort === 'following' ? 'new' : sort,
    author: pick(params.get('author')), placeId: pick(params.get('place')), following: sort === 'following',
    before: before && !Number.isNaN(Date.parse(before)) ? before : null,
    staff: Boolean(await staffRole(db, user)),
  });
  return ok(feed);
});

/** POST /api/club/posts { body, place_id?, event_id? } — share a plan, a question or a tip about a place. */
export const POST = clubApi('CreatePost', async (request) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db, { speak: true });
  const limited = await enforceRateLimit(request, 'club_post', 30, 24 * 3600_000, user.id);
  if (limited) return limited;
  return ok({ post: await createPost(db, profile, await readBody(request)) }, { status: 201 });
});
