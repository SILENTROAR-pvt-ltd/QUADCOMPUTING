import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, ok, query, readBody } from '@/lib/club/http';
import { requireMember, staffRole } from '@/lib/club/auth';
import { payoutsFor, requestPayout } from '@/lib/club/payments/payouts.service';
import { loadEvent } from '@/lib/club/events/events.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/payouts?event_id= — a plan's payouts (its creator and staff). */
export const GET = clubApi('Payouts', async (request) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const eventId = query(request).get('event_id') || '';
  const event = await loadEvent(db, eventId);
  if (event.creator_id !== user.id && !(await staffRole(db, user))) fail(403, 'Only the plan creator or staff can see payouts.');
  return ok({ payouts: await payoutsFor(db, { eventId }) });
});

/** POST /api/club/payouts { event_id, property_id? | payee_label, amount, idempotency_key } — request a vendor payout. */
export const POST = clubApi('RequestPayout', async (request) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const staff = Boolean(await staffRole(db, user));
  return ok({ payout: await requestPayout(db, user.id, staff, await readBody(request)) });
});
