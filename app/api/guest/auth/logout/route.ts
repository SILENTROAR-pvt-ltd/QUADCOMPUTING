import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { sessionCookie } from '@/lib/auth/guest-auth';
import { endSessionForRequest } from '@/lib/services/guest-auth/guest-account.service';

export const dynamic = 'force-dynamic';

/** POST /api/guest/auth/logout — ends this device's guest session. Safe to call when signed out. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  await endSessionForRequest(adminDb(), request);
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.headers.append('Set-Cookie', sessionCookie(null));
  return response;
}, 'GuestAuthLogout');
