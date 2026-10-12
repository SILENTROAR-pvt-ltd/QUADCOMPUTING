import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, idParam, ok, readBody } from '@/lib/club/http';
import { requireMember, staffRole } from '@/lib/club/auth';
import { cancelMeetup, joinMeetup, leaveMeetup, meetupView } from '@/lib/club/meetups/meetups.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/meetups/:id — the meetup and everyone who is in. */
export const GET = clubApi('Meetup', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  return ok(await meetupView(db, await idParam(ctx), user.id, Boolean(await staffRole(db, user))));
});

/** POST /api/club/meetups/:id { action: join | leave | cancel } */
export const POST = clubApi('MeetupAction', async (request, ctx) => {
  const db = adminDb();
  const id = await idParam(ctx);
  const body = await readBody(request);
  const { user, profile } = await requireMember(db, { speak: body.action === 'join' });
  switch (body.action) {
    case 'join':
      return ok({ meetup: await joinMeetup(db, id, profile) });
    case 'leave':
      return ok({ meetup: await leaveMeetup(db, id, user.id) });
    case 'cancel':
      return ok({ meetup: await cancelMeetup(db, id, user.id, Boolean(await staffRole(db, user))) });
    default:
      fail(400, 'Unknown action.');
  }
});
