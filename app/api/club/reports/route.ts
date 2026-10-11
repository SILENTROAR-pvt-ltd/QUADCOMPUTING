import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { fileReport } from '@/lib/club/moderation/reports.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/reports { target_type, target_id, reason } — flags a member, message, story, plan or listing. */
export const POST = clubApi('Report', async (request) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const limited = await enforceRateLimit(request, 'club_report', 20, 60 * 60_000, user.id);
  if (limited) return limited;
  await fileReport(db, user.id, await readBody(request));
  return ok({ message: 'Thanks. Our team will look at it.' });
});
