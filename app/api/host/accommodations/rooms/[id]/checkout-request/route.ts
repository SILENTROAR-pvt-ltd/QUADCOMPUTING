import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { dismissCheckoutRequest } from '@/lib/services/stay/checkout-request.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/host/accommodations/rooms/[id]/checkout-request { action: 'dismiss' }
 * The desk clears the guest's check-out request without checking them out. Checking out (the room checkout route)
 * clears it by itself.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { id: roomId } = await params;
    const body = await request.json().catch(() => ({}));
    if (body?.action !== 'dismiss') return NextResponse.json({ success: false, error: 'Choose an action.' }, { status: 400 });
    const ok = await dismissCheckoutRequest(adminDb(), auth.businessId, roomId);
    if (!ok) return NextResponse.json({ success: false, error: 'Could not clear the request. Please try again.' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, request, 'HostCheckoutRequestPOST');
  }
}, 'HostCheckoutRequestPOST');
