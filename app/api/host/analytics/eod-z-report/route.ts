import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { computeEodZReport, resolveZRange, ZReportRangeError } from '@/lib/services/analytics/eod-z-report.service';

/** End-of-day Z-report for one IST business day (`date`) or a range (`startDate`/`endDate`). */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, business, supabase } = auth;

    let range;
    try {
      range = resolveZRange(request.url);
    } catch (e) {
      if (e instanceof ZReportRangeError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }

    const report = await computeEodZReport(supabase, { ...business, id: businessId }, range);
    return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostAnalyticsEodZReportGET');
  }
}, 'HostAnalyticsEodZReportGET');
