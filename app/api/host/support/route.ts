import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { createTicket, parseTicket, venueTickets } from '@/lib/services/admin/support.service';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };

/** GET /api/host/support: this venue's own tickets with the platform's replies. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    return NextResponse.json({ success: true, tickets: await venueTickets(adminDb(), auth.businessId) }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostSupportGET');
  }
}, 'HostSupportGET');

/** POST { subject, body, category, priority }: ask the platform for help. The owner only, a few per hour. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    if (auth.staff) return NextResponse.json({ success: false, error: 'Only the owner can raise a support ticket.' }, { status: 403, headers: NO_STORE });
    const limited = await enforceRateLimit(request, 'host_support_ticket', 6, 60 * 60_000, auth.businessId);
    if (limited) return limited;
    const parsed = parseTicket(await request.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400, headers: NO_STORE });
    const res = await createTicket(adminDb(), auth.businessId, auth.staff ? null : auth.user.id, parsed.value);
    return res.ok
      ? NextResponse.json({ success: true, ticket: res.ticket }, { status: 201, headers: NO_STORE })
      : NextResponse.json({ success: false, error: res.error }, { status: 503, headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostSupportPOST');
  }
}, 'HostSupportPOST');
