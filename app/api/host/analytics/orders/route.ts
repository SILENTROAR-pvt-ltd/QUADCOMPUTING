import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { resolveAnalyticsDateRange } from '@/lib/services/analytics/date-range.util';
import { fetchOrdersLedger } from '@/lib/services/analytics/orders-ledger.service';

/** Bills for the dashboard's period, each with its guest (name, wallet handle, phone) and wallet use. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;
    const { startDate, endDate } = resolveAnalyticsDateRange(request.url);
    const { orders, truncated } = await fetchOrdersLedger(supabase, businessId, startDate, endDate);
    return NextResponse.json(
      { success: true, start_date: startDate, end_date: endDate, truncated, orders },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return handleApiError(error, request, 'HostAnalyticsOrdersGET');
  }
}, 'HostAnalyticsOrdersGET');
