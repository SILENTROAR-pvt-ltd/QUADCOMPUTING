import { NextResponse } from 'next/server';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { roomCookieOptions } from '@/lib/services/stay/room-session';

export const dynamic = 'force-dynamic';

/**
 * POST /api/guest/stay/leave: forgets every room this browser was confirmed in. Called when a guest logs out of their
 * Vibers ID on a phone, so the next person holding it does not find someone else's room, bill and ordering.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const names = (request.headers.get('cookie') || '').split(';').map((p) => p.trim().split('=')[0]).filter((n) => n.startsWith('qc_room_'));
  const response = NextResponse.json({ success: true, left: names.length }, { headers: { 'Cache-Control': 'no-store' } });
  for (const name of names) response.cookies.set(name, '', { ...roomCookieOptions, maxAge: 0 });
  return response;
}, 'StayLeavePOST');
