import { adminDb } from '@/lib/supabase/admin';
import { clubApi, idParam, ok } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { recordStoryView } from '@/lib/club/stories.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/stories/:id/view — leave a receipt that you watched this story. */
export const POST = clubApi('StoryView', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  await recordStoryView(db, user.id, await idParam(ctx));
  return ok();
});
