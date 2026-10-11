import { adminDb } from '@/lib/supabase/admin';
import { clubApi, idParam, ok } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { deleteStory } from '@/lib/club/stories.service';

export const dynamic = 'force-dynamic';

/** DELETE /api/club/stories/:id — the author takes their story down early. */
export const DELETE = clubApi('DeleteStory', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  await deleteStory(db, user.id, await idParam(ctx));
  return ok();
});
