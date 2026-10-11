import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, must, ok, query, readBody } from '@/lib/club/http';
import { requireStaff } from '@/lib/club/auth';
import { listEvents } from '@/lib/club/events/events.service';
import { approveEvent, rejectEvent } from '@/lib/club/events/event-review.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/admin/events?status=submitted — plans waiting for review, with their signed consent. */
export const GET = clubApi('AdminEvents', async (request) => {
  const db = adminDb();
  await requireStaff(db);
  const status = query(request).get('status') || 'submitted';
  const events = await listEvents(db, { status, limit: 100 });
  const consents = events.length
    ? (must(await db.from('club_event_consents').select('event_id, viber_id, version, ip, signed_at').in('event_id', events.map((e) => e.id))) as any[])
    : [];
  return ok({ events: events.map((e) => ({ ...e, consent: consents.find((c) => c.event_id === e.id) ?? null })) });
});

/** POST /api/club/admin/events { event_id, decision: approve|reject, note? } */
export const POST = clubApi('AdminReviewEvent', async (request) => {
  const db = adminDb();
  const { user } = await requireStaff(db);
  const body = await readBody(request);
  const id = String(body.event_id || '');
  if (body.decision === 'approve') return ok(await approveEvent(db, user.id, id));
  if (body.decision === 'reject') return ok({ event: await rejectEvent(db, user.id, id, body.note) });
  fail(400, 'Choose approve or reject.');
});
