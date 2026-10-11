import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, ok, query, readBody } from '@/lib/club/http';
import { requireStaff } from '@/lib/club/auth';
import { approvePayout, markPayoutPaid, payoutsFor, rejectPayout } from '@/lib/club/payments/payouts.service';
import { eventStatement } from '@/lib/club/ledger/reconcile.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/admin/payouts?status= | ?event_id= (adds the plan's statement) — the payout queue. */
export const GET = clubApi('AdminPayouts', async (request) => {
  const db = adminDb();
  await requireStaff(db);
  const q = query(request);
  const eventId = q.get('event_id');
  if (eventId) return ok({ payouts: await payoutsFor(db, { eventId }), statement: await eventStatement(db, eventId) });
  return ok({ payouts: await payoutsFor(db, { status: q.get('status') || 'pending_approval' }) });
});

/** POST /api/club/admin/payouts { payout_id, op: approve|paid|reject, reference?, note? } */
export const POST = clubApi('AdminPayout', async (request) => {
  const db = adminDb();
  const { user } = await requireStaff(db);
  const body = await readBody(request);
  const id = String(body.payout_id || '');
  if (body.op === 'approve') return ok({ payout: await approvePayout(db, user.id, id) });
  if (body.op === 'paid') return ok({ payout: await markPayoutPaid(db, user.id, id, body.reference) });
  if (body.op === 'reject') return ok({ payout: await rejectPayout(db, user.id, id, body.note) });
  fail(400, 'Choose approve, paid or reject.');
});
