import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { getDailyZReport } from '@/lib/services/analytics/z-report.service';
import { generateZReportCSV } from '@/lib/services/analytics/z-report-export.service';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    // 1. Guard check: Must be an authenticated host
    const auth = await requireHost(request);
    if (auth.error) return auth.error;

    const { businessId, business } = auth;
    const { searchParams } = new URL(request.url);

    const dateParam = searchParams.get('date');
    const formatParam = searchParams.get('format')?.toLowerCase();
    const acceptHeader = request.headers.get('accept') || '';

    // 2. Compute Z-Report strictly from orders.status = 'settled'. The report function is server-only (migration
    // 20261021000004); the venue is the one requireHost signed in, and the function re-checks ownership itself.
    const reportData = await getDailyZReport(businessId, dateParam, adminDb());

    // 3. Format handling (CSV vs JSON)
    if (formatParam === 'csv' || acceptHeader.includes('text/csv')) {
      const csv = generateZReportCSV(reportData, {
        businessName: business?.business_name || business?.name || 'Venue',
        gstNumber: business?.gst_number || 'NOT REGISTERED',
      });

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="z-report-${reportData.date}.csv"`,
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    // Default JSON Response
    return NextResponse.json({
      success: true,
      venue: {
        id: businessId,
        name: business?.business_name || business?.name || 'Venue',
        gst_number: business?.gst_number || null,
      },
      ...reportData,
    });
  } catch (error: any) {
    return handleApiError(error, request, 'AnalyticsZReportGET');
  }
}, 'AnalyticsZReportGET');
