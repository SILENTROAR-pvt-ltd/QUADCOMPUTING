import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { liveStories, postStory } from '@/lib/club/stories.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/stories — live (24 h) stories grouped by member. */
export const GET = clubApi('Stories', async () => {
  const db = adminDb();
  const { user } = await requireMember(db);
  return ok({ groups: await liveStories(db, user.id) });
});

/** POST /api/club/stories { media_path, caption? } — after uploading with kind=stories. */
export const POST = clubApi('PostStory', async (request) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db, { speak: true });
  const limited = await enforceRateLimit(request, 'club_story', 20, 24 * 3600_000, user.id);
  if (limited) return limited;
  return ok({ story: await postStory(db, profile, await readBody(request)) });
});
