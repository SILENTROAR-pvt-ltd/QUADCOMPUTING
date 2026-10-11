import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { loadGstStatus } from '@/lib/services/billing/gst-policy';

export const dynamic = 'force-dynamic';

/** Whether this venue may charge GST (a valid GSTIN the host has confirmed), and why not if it can't. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const status = await loadGstStatus(auth.supabase, auth.businessId);
    return NextResponse.json({ success: true, ...status }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostGstStatusGET');
  }
}, 'HostGstStatusGET');
