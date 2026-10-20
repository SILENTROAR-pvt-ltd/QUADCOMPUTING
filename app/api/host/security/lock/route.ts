import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { MASTER_UNLOCK_COOKIE } from '@/lib/services/security/master-unlock';

export const dynamic = 'force-dynamic';

/**
 * Ends the master-PIN unlock on this device. The unlock is a signed, HttpOnly cookie the server set when the master
 * PIN was entered (staff/verify-pin), so the browser cannot drop it by itself: "Lock now" used to clear only the
 * page's own flag, and the server kept accepting writes behind the master PIN from that browser until the cookie
 * expired. This clears the cookie, so the next write asks for the PIN again.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const response = NextResponse.json({ success: true, locked: true }, { headers: { 'Cache-Control': 'no-store' } });
  // Same attributes as the cookie that was set, or the browser keeps the original.
  response.cookies.set(MASTER_UNLOCK_COOKIE, '', {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0,
  });
  return response;
}, 'HostSecurityLockPOST');
