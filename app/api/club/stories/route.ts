import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok, query, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { homePlaceIdFor, resolvePlace } from '@/lib/club/social/places.service';
import { placeStories, postStory, storyTray } from '@/lib/club/stories.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/club/stories — your ranked story tray: { mine, groups }.
 * GET /api/club/stories?place=<id> — the live stories at one place, ranked for you: { groups }.
 */
export const GET = clubApi('Stories', async (request) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db);
  const placeParam = query(request).get('place');
  if (placeParam) {
    const place = await resolvePlace(db, placeParam);
    return ok({ place: { id: place.id, name: place.name }, groups: await placeStories(db, place.id, user.id, await homePlaceIdFor(db, profile.city)) });
  }
  return ok(await storyTray(db, user.id, await homePlaceIdFor(db, profile.city)));
});

/** POST /api/club/stories { media_path, caption?, place_id? } — after uploading with kind=stories. */
export const POST = clubApi('PostStory', async (request) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db, { speak: true });
  const limited = await enforceRateLimit(request, 'club_story', 20, 24 * 3600_000, user.id);
  if (limited) return limited;
  return ok({ story: await postStory(db, profile, await readBody(request)) });
});
