import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { normalizeHandle } from '@/lib/auth/guest-auth';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { signedInUser } from '@/lib/services/guest-auth/vibers-connect.service';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET /api/guest/auth/handle-check?handle=name — is this @handle free for the signed-in person to take?
 * 'available' | 'taken' | 'legacy' (an old @handle + PIN account holds it: the PIN step brings the wallet across)
 * | 'invalid'. Signed-in only and rate limited, so it cannot be used to list handles. It is advice for the form;
 * saving the profile re-checks everything and is the real gate.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ success: false, error: 'Sign in first.' }, { status: 401, headers: noStore });

  const limited = await enforceRateLimit(request, 'handle_check', 60, 60_000, user.id);
  if (limited) return limited;

  const handle = normalizeHandle(new URL(request.url).searchParams.get('handle'));
  if (!handle) return NextResponse.json({ success: true, status: 'invalid' }, { headers: noStore });

  const db = adminDb();
  const [vibers, guests] = await Promise.all([
    db.from('vibers_accounts').select('user_id').eq('handle', handle).maybeSingle(),
    db.from('guest_accounts').select('user_id').eq('handle', handle),
  ]);
  if (vibers.error) throw vibers.error;
  if (guests.error) throw guests.error;

  const mine = (id: string | null) => id === user.id;
  if (vibers.data && !mine(vibers.data.user_id)) return NextResponse.json({ success: true, status: 'taken' }, { headers: noStore });
  const rows = guests.data || [];
  if (rows.some((r: any) => r.user_id && !mine(r.user_id))) return NextResponse.json({ success: true, status: 'taken' }, { headers: noStore });
  if (rows.some((r: any) => !r.user_id)) return NextResponse.json({ success: true, status: 'legacy' }, { headers: noStore });
  return NextResponse.json({ success: true, status: 'available' }, { headers: noStore });
}, 'GuestHandleCheck');
