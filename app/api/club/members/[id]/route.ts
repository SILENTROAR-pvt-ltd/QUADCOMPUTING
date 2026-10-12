import { adminDb } from '@/lib/supabase/admin';
import { clubApi, idParam, ok } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { memberProfile } from '@/lib/club/membership/member-profile.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/members/:id — a member's travel profile (counts, online now, upcoming plans hosted). */
export const GET = clubApi('MemberProfile', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const id = await idParam(ctx);
  return ok(await memberProfile(db, id, user.id));
});
