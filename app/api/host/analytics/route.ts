import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { computeEodReport } from '@/lib/services/analytics.service';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const payload = await computeEodReport(request.url, supabase);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('[API Analytics]', error);
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Business not found' ? 404 : 500;
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
  }
}, 'HostAnalyticsGET');
