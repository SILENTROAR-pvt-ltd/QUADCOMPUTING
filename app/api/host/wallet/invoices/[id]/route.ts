import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { fetchInvoiceDetail, INVOICE_ID } from '@/lib/services/wallet/invoice-detail.service';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/host/wallet/invoices/:id: one settled bill of the signed-in venue, in full. */
export const GET = withApiErrorBoundary(async function GET(request: Request, ctx: Ctx) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  if (!INVOICE_ID.test(id)) return NextResponse.json({ success: false, error: 'Invoice not found.' }, { status: 404 });
  const invoice = await fetchInvoiceDetail(adminDb(), auth.business.id, id);
  if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found.' }, { status: 404 });
  const venueName = String(auth.business.business_name || auth.business.name || 'Venue');
  return NextResponse.json({ success: true, invoice, venueName }, { headers: { 'Cache-Control': 'no-store' } });
}, 'HostWalletInvoiceGET');
