import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { loadMenuInfo, saveMenuInfo } from '@/lib/services/menu-info/menu-info';

export const dynamic = 'force-dynamic';

/** The venue's menu information (tagline, address, phones, timings, notes). */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const info = await loadMenuInfo(auth.supabase, auth.businessId);
    return NextResponse.json({ success: true, info }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostMenuInfoGET');
  }
}, 'HostMenuInfoGET');

export const PUT = withApiErrorBoundary(async function PUT(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => null);
    const result = await saveMenuInfo(auth.supabase, auth.businessId, body?.info ?? body);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, info: result.value });
  } catch (error) {
    return handleApiError(error, request, 'HostMenuInfoPUT');
  }
}, 'HostMenuInfoPUT');
