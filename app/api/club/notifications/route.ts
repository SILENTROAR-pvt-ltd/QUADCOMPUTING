import { adminDb } from '@/lib/supabase/admin';
import { clubApi, ok, readBody } from '@/lib/club/http';
import { requireUser } from '@/lib/club/auth';
import { listNotifications, markNotificationsRead } from '@/lib/club/notifications.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/notifications — the latest 30. Applicants get their review result here too. */
export const GET = clubApi('Notifications', async () => {
  const user = await requireUser();
  return ok({ notifications: await listNotifications(adminDb(), user.id) });
});

/** POST /api/club/notifications { ids? } — marks some (or all) as read. */
export const POST = clubApi('NotificationsRead', async (request) => {
  const user = await requireUser();
  const body = await readBody(request);
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === 'string').slice(0, 100) : undefined;
  await markNotificationsRead(adminDb(), user.id, ids);
  return ok();
});
