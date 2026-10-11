import { adminDb } from '@/lib/supabase/admin';
import { getClientIp } from '@/lib/middleware/rate-limiter';
import { clubApi, fail, idParam, ok, readBody } from '@/lib/club/http';
import { requireMember, staffRole } from '@/lib/club/auth';
import { submitEvent } from '@/lib/club/events/events.service';
import { markInterested, reserveSpot } from '@/lib/club/events/participation.service';
import { completeEvent } from '@/lib/club/events/event-review.service';
import { issueNoc } from '@/lib/club/ledger/noc.service';
import { startInstallment } from '@/lib/club/payments/checkout.service';
import { razorpayGateway } from '@/lib/club/payments/razorpay';

export const dynamic = 'force-dynamic';

/**
 * POST /api/club/events/:id/action { action, … }
 *   submit   { agree, consent_version } — creator signs the consent and sends the plan for review
 *   interest — join the plan's discussion room
 *   reserve  — take a spot
 *   pay      — start the next instalment (returns the gateway order)
 *   complete — creator marks the plan finished
 *   noc      — issue (or fetch) the No Objection Certificate
 */
export const POST = clubApi('EventAction', async (request, ctx) => {
  const db = adminDb();
  const id = await idParam(ctx);
  const body = await readBody(request);
  const { user, profile } = await requireMember(db, { speak: body.action === 'submit' || body.action === 'interest' });
  switch (body.action) {
    case 'submit':
      return ok({ event: await submitEvent(db, profile, id, body, { ip: getClientIp(request), userAgent: request.headers.get('user-agent') }) });
    case 'interest':
      return ok(await markInterested(db, id, profile));
    case 'reserve':
      return ok(await reserveSpot(db, id, profile));
    case 'pay':
      return ok(await startInstallment(db, razorpayGateway(), profile, id));
    case 'complete':
      return ok({ event: await completeEvent(db, user.id, id, Boolean(await staffRole(db, user))) });
    case 'noc':
      return ok({ noc: await issueNoc(db, user.id, id, Boolean(await staffRole(db, user))) });
    default:
      fail(400, 'Unknown action.');
  }
});
