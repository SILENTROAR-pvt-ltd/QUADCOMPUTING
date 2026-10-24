import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { adminGate, ok } from '@/lib/services/admin/admin-route';
import { loadVenueDirectory } from '@/lib/services/admin/venues.service';

export const dynamic = 'force-dynamic';

/** GET /api/admin/venues: every venue with its plan, money, compliance and review status. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    return ok({ venues: await loadVenueDirectory(adminDb()) });
  } catch (error) {
    return handleApiError(error, request, 'AdminVenuesGET');
  }
}, 'AdminVenuesGET');
