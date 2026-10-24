import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { adminGate, ok } from '@/lib/services/admin/admin-route';
import { loadSystem } from '@/lib/services/admin/system.service';

export const dynamic = 'force-dynamic';

/** GET /api/admin/system: health checks, data volumes, Vibey in the last 24 hours, connection estimate, console links. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    return ok(await loadSystem(adminDb()));
  } catch (error) {
    return handleApiError(error, request, 'AdminSystemGET');
  }
}, 'AdminSystemGET');
