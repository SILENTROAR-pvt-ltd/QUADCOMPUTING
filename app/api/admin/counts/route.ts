import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { adminGate, ok } from '@/lib/services/admin/admin-route';
import { countRows } from '@/lib/services/admin/overview.service';

export const dynamic = 'force-dynamic';

/** GET /api/admin/counts: what is waiting (sidebar badges): payments to verify, venues to review, open tickets. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    const db = adminDb();
    const [payments, reviews, tickets] = await Promise.all([
      countRows(db, 'venue_topup_requests', (q) => q.eq('status', 'pending')),
      countRows(db, 'platform_venue_reviews', (q) => q.in('status', ['pending', 'needs_docs'])),
      countRows(db, 'support_tickets', (q) => q.neq('status', 'resolved')),
    ]);
    return ok({ counts: { payments: payments ?? 0, reviews: reviews ?? 0, tickets: tickets ?? 0 } });
  } catch (error) {
    return handleApiError(error, request, 'AdminCountsGET');
  }
}, 'AdminCountsGET');
