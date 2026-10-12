import { adminDb } from '@/lib/supabase/admin';
import { clubApi, ok, query } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { exploreFeed } from '@/lib/club/explore/explore.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/club/explore?q=&type=&location=&live=1&until=ISO — trips, events and instant meetups in one
 * feed, live ones first. Search text, where it is, what type, and when are all optional.
 */
export const GET = clubApi('Explore', async (request) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const params = query(request);
  const feed = await exploreFeed(db, user.id, {
    q: params.get('q'), type: params.get('type'), location: params.get('location'),
    live: params.get('live') === '1', until: params.get('until'),
  });
  return ok(feed);
});
