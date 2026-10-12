import { adminDb } from '@/lib/supabase/admin';
import { clubApi, ok } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { myActivity } from '@/lib/club/explore/activity.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/activity — what the member hosts, what they have joined, and their history (plans and meetups together). */
export const GET = clubApi('Activity', async () => {
  const db = adminDb();
  const { user } = await requireMember(db);
  return ok(await myActivity(db, user.id));
});
