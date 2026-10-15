import { safeMessage } from '@/lib/utils/safe-message';
import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;

    const supabase = adminDb();
    const { searchParams } = new URL(request.url);
    const paramVenueId = searchParams.get('venue_id');
    if (paramVenueId && paramVenueId !== businessId) {
      return NextResponse.json({ success: false, error: 'Forbidden: Venue mismatch' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('venue_outstanding_bills')
      .select('*')
      .eq('venue_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ success: true, bills: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'HostWalletOutstandingGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  return NextResponse.json(
    { success: false, error: 'Forbidden: Outstanding bills can only be settled by an Admin.' },
    { status: 403 }
  );
}, 'HostWalletOutstandingPOST');
