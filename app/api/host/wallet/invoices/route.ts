import { safeMessage } from '@/lib/utils/safe-message';
import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { fetchInvoicePage, fetchInvoiceSummary } from '@/lib/services/wallet/invoice-history.service';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET /api/host/wallet/invoices?cursor=…&limit=25
 * The venue's settled bills, newest first, each with its platform fee. The first page (no cursor) also carries the
 * totals: revenue from settled bills (the analytics rule), fees charged and fees still due.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Number(searchParams.get('limit')) || 25;
    const db = adminDb();

    const [page, summary] = await Promise.all([
      fetchInvoicePage(db, businessId, cursor, limit),
      cursor ? Promise.resolve(null) : fetchInvoiceSummary(db, businessId),
    ]);
    return NextResponse.json({ success: true, ...page, ...(summary ? { summary } : {}) }, { headers: noStore });
  } catch (error: any) {
    if (error?.status === 400) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'HostWalletInvoicesGET');
