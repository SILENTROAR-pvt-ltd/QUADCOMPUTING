import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;

    const supabase = adminDb();
    // Newest first, bounded. Unbounded reads hit the API's row cap (1,000 by default) and are
    // truncated silently; an explicit limit plus a `truncated` flag keeps that visible.
    const { searchParams } = new URL(request.url);
    const requested = parseInt(searchParams.get('limit') || '', 10);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 1000) : 500;
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ orders, truncated: (orders?.length ?? 0) === limit, limit, offset });
  } catch (error: any) {
    console.error('[API Orders History GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, 'HostOrdersHistoryGET');
