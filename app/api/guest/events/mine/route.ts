import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { guestContact } from '@/lib/services/live-events/guest-identity';
import { resolveGuestKey } from '@/lib/services/live-events/ledger.service';
import { myEventStatuses, readLeadIds } from '@/lib/services/live-events/my-event-status';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guest/events/mine?venue_id=&ids=<request ids this phone holds>
 * The guest's own requests to join events, with the venue's answer (waiting, confirmed, declined). Matched only by the
 * guest's sign-in or by request ids, never by a typed phone or email. Private: never cached.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const validation = await validateGuestAccess(q.get('venue_id') || q.get('cafe_id'));
  if (validation.error) return validation.error;
  const businessId = validation.businessId;
  const limited = await enforceRateLimit(request, 'guest_events_mine', 600, 60_000, businessId, { localOnly: true });
  if (limited) return limited;

  const db = adminDb();
  const me = await guestContact(db, request, businessId);
  const key = me.signedIn ? await resolveGuestKey(db, businessId, { handle: me.handle, phone: me.phone, email: me.email }) : null;
  const statuses = await myEventStatuses(db, businessId, readLeadIds(q.get('ids')), key);
  return NextResponse.json({ success: true, statuses }, { headers: { 'Cache-Control': 'private, no-store' } });
}, 'GuestMyEventsGET');
