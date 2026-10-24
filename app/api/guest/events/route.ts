import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { listPublicEvents } from '@/lib/services/live-events/events.service';
import { hasFeature } from '@/lib/services/billing/feature-gate';

export const dynamic = 'force-dynamic';

/** GET /api/guest/events?venue_id= — the venue's live and upcoming events. Public, and the same for everyone. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validation = await validateGuestAccess(searchParams.get('venue_id') || searchParams.get('cafe_id'));
  if (validation.error) return validation.error;
  const limited = await enforceRateLimit(request, 'guest_events_get', 300, 60_000, validation.businessId);
  if (limited) return limited;

  // Events are part of M²-Pro and Rhodium: on M¹-Pro the guests' lounge shows none.
  const db = adminDb();
  const events = (await hasFeature(validation.businessId, 'events', db)) ? await listPublicEvents(db, validation.businessId) : [];
  return NextResponse.json({ success: true, events }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=60' } });
}, 'GuestEventsGET');
