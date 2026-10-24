import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { adminGate, ok } from '@/lib/services/admin/admin-route';
import { listAdminActions } from '@/lib/services/admin/admin-audit';

export const dynamic = 'force-dynamic';

/** GET /api/admin/audit: the latest 100 super-admin actions, newest first. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    return ok(await listAdminActions(adminDb(), undefined, 100));
  } catch (error) {
    return handleApiError(error, request, 'AdminAuditGET');
  }
}, 'AdminAuditGET');
