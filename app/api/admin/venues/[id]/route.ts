import { adminDb } from '@/lib/supabase/admin';
import { UUID_REGEX } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { adminGate, fail, ok } from '@/lib/services/admin/admin-route';
import { parseVenueAction } from '@/lib/services/admin/venue-actions';
import { runVenueAction } from '@/lib/services/admin/venue-actions.service';
import { listAdminActions } from '@/lib/services/admin/admin-audit';

export const dynamic = 'force-dynamic';

/** GET /api/admin/venues/:id : the admin log for this venue. */
export const GET = withApiErrorBoundary(async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    const { id } = await params;
    if (!UUID_REGEX.test(id)) return fail('Unknown venue.', 404);
    return ok(await listAdminActions(adminDb(), id, 30));
  } catch (error) {
    return handleApiError(error, request, 'AdminVenueGET');
  }
}, 'AdminVenueGET');

/**
 * POST /api/admin/venues/:id { action, ... }: give or extend a plan, start a free month, move to You earn, we earn,
 * add or end Vibey, waive the setup, suspend or resume, or set the review status. Every change is in the admin log.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    const { id } = await params;
    if (!UUID_REGEX.test(id)) return fail('Unknown venue.', 404);
    const parsed = parseVenueAction(await request.json().catch(() => null));
    if (!parsed.ok) return fail(parsed.error);
    const res = await runVenueAction(adminDb(), id, parsed.value, gate.actor);
    return res.ok ? ok({ message: res.message }) : fail(res.error, res.status);
  } catch (error) {
    return handleApiError(error, request, 'AdminVenuePOST');
  }
}, 'AdminVenuePOST');
