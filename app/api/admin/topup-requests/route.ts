import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import {
  getAllTopupRequests,
  approveTopupRequest,
  rejectTopupRequest,
} from '@/lib/services/wallet/venue-wallet.service';
import type { TopupRequestStatus } from '@/types/wallet';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';

export const dynamic = 'force-dynamic';

const STATUSES = ['pending', 'approved', 'rejected', 'all'];

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const adminAuth = await requireAdmin(request);
    if (adminAuth.error) return adminAuth.error;

    const statusParam = new URL(request.url).searchParams.get('status') || 'all';
    const status = (STATUSES.includes(statusParam) ? statusParam : 'all') as TopupRequestStatus | 'all';
    const requests = await getAllTopupRequests(adminAuth.supabase, status);
    return NextResponse.json({ success: true, requests });
  } catch (error) {
    return handleApiError(error, request, 'AdminTopupRequestsGET');
  }
}, 'AdminTopupRequestsGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const adminAuth = await requireAdmin(request);
    if (adminAuth.error) return adminAuth.error;

    const body = await request.json().catch(() => ({}));
    const { requestId, action, reason } = body || {};
    if (!requestId || typeof requestId !== 'string') {
      return NextResponse.json({ success: false, error: 'requestId is required' }, { status: 400 });
    }
    // The reviewer is the signed-in admin; a name sent in the body is never trusted for the audit trail.
    const reviewer = adminAuth.adminId;

    if (action === 'approve') {
      return NextResponse.json(await approveTopupRequest(adminDb(), requestId, reviewer));
    }
    if (action === 'reject') {
      const why = typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 300) : 'Payment verification failed';
      return NextResponse.json(await rejectTopupRequest(adminAuth.supabase, requestId, why, reviewer));
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Must be approve or reject.' },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error, request, 'AdminTopupRequestsPOST');
  }
}, 'AdminTopupRequestsPOST');
