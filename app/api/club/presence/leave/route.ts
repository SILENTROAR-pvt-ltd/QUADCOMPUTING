import { adminDb } from '@/lib/supabase/admin';
import { clubApi, ok } from '@/lib/club/http';
import { sessionUser } from '@/lib/club/auth';
import { leave } from '@/lib/club/presence.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/presence/leave — tab hidden, closed or signing out: off the live grid at once. */
export const POST = clubApi('Leave', async () => {
  const user = await sessionUser();
  if (user) await leave(adminDb(), user.id);
  return ok();
});
