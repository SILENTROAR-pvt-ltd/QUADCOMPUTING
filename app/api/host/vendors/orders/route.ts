import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { recentOrdersToShare } from '@/lib/services/vendors/vendors.service';

export const dynamic = 'force-dynamic';

/** GET /api/host/vendors/orders: the venue's guest orders from the last two days, to share with a vendor on WhatsApp. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const orders = await recentOrdersToShare(adminDb(), auth.business.id);
  return NextResponse.json({ success: true, orders, venueName: auth.business.business_name || auth.business.name || 'our venue' }, { headers: { 'Cache-Control': 'no-store' } });
}, 'HostVendorOrdersGET');
