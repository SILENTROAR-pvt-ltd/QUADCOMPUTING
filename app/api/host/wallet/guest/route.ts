import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { HANDLE_PATTERN, loadGuestWalletForHost } from '@/lib/services/wallet/host-wallet-view.service';

export const dynamic = 'force-dynamic';

/** GET /api/host/wallet/guest?handle=@name — the linked guest's wallet at this venue, for billing. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const { businessId } = auth;

  const handle = (new URL(request.url).searchParams.get('handle') || '').trim().toLowerCase();
  if (!HANDLE_PATTERN.test(handle)) {
    return NextResponse.json({ success: false, error: 'A valid guest handle is required.' }, { status: 400 });
  }

  const view = await loadGuestWalletForHost(adminDb(), businessId, handle);
  return NextResponse.json({ success: true, ...view }, { headers: { 'Cache-Control': 'no-store' } });
}, 'HostWalletGuestGET');
