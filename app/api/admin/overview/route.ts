import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { adminGate, ok } from '@/lib/services/admin/admin-route';
import { loadOverview } from '@/lib/services/admin/overview.service';
import { checkHealth } from '@/lib/services/admin/health.service';
import { WINDOWS } from '@/lib/services/admin/analytics.service';

export const dynamic = 'force-dynamic';

/** GET /api/admin/overview?days=7|30|90 : the dashboard, live (against the window before), plus system health. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    const asked = Number(new URL(request.url).searchParams.get('days'));
    const days = (WINDOWS as readonly number[]).includes(asked) ? asked : 7;
    const db = adminDb();
    const [overview, health] = await Promise.all([loadOverview(db, days), checkHealth(db)]);
    return ok({ ...overview, health });
  } catch (error) {
    return handleApiError(error, request, 'AdminOverviewGET');
  }
}, 'AdminOverviewGET');
