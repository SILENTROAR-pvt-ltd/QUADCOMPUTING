import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { loadStayDetail } from '@/lib/services/accommodation/stay-detail.service';

export const dynamic = 'force-dynamic';

/** GET /api/host/accommodations/history/[id]: one past stay in full, for the desk's stay history. */
export const GET = withApiErrorBoundary(async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const detail = await loadStayDetail(auth.supabase, adminDb(), auth.businessId, id);
    if (!detail) return NextResponse.json({ success: false, error: 'Stay not found' }, { status: 404 });
    return NextResponse.json({ success: true, ...detail }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostStayHistoryDetailGET');
  }
}, 'HostStayHistoryDetailGET');
