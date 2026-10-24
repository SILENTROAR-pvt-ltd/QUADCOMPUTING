import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { adminGate, ok } from '@/lib/services/admin/admin-route';
import { loadFinance } from '@/lib/services/admin/finance.service';

export const dynamic = 'force-dynamic';

/** GET /api/admin/finance: fees, plan and setup income, dues, venue credit and guest cashback held, per venue. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    return ok(await loadFinance(adminDb()));
  } catch (error) {
    return handleApiError(error, request, 'AdminFinanceGET');
  }
}, 'AdminFinanceGET');
