import { adminDb } from '@/lib/supabase/admin';
import { clubApi, idParam, ok, readBody } from '@/lib/club/http';
import { requireMember, staffRole } from '@/lib/club/auth';
import { updateEvent } from '@/lib/club/events/events.service';
import { eventView } from '@/lib/club/events/event-view.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/events/:id — the plan as this viewer may see it. */
export const GET = clubApi('Event', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const staff = Boolean(await staffRole(db, user));
  return ok(await eventView(db, await idParam(ctx), user.id, staff));
});

/** PATCH /api/club/events/:id — the creator edits a draft (or a rejected plan, which returns to draft). */
export const PATCH = clubApi('UpdateEvent', async (request, ctx) => {
  const db = adminDb();
  const { profile } = await requireMember(db, { speak: true });
  return ok({ event: await updateEvent(db, profile, await idParam(ctx), await readBody(request)) });
});
