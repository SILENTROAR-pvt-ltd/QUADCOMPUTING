import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { adminGate, ok } from '@/lib/services/admin/admin-route';
import { loadAnalytics, WINDOWS } from '@/lib/services/admin/analytics.service';

export const dynamic = 'force-dynamic';

/** GET /api/admin/analytics?days=7|30|90: GMV per day, leaderboard, F&B vs stays, peak hours, against the window before. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    const asked = Number(new URL(request.url).searchParams.get('days'));
    const days = (WINDOWS as readonly number[]).includes(asked) ? asked : 30;
    return ok(await loadAnalytics(adminDb(), days));
  } catch (error) {
    return handleApiError(error, request, 'AdminAnalyticsGET');
  }
}, 'AdminAnalyticsGET');
