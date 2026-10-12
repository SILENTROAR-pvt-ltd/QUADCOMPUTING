import { adminDb } from '@/lib/supabase/admin';
import { clubApi, idParam, ok } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { storyViewers } from '@/lib/club/stories.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/stories/:id/viewers — who watched your story (authors only). */
export const GET = clubApi('StoryViewers', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  return ok(await storyViewers(db, await idParam(ctx), user.id));
});
