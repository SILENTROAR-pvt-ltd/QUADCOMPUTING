import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveHostBusinesses } from '@/lib/auth/guards';
import { getVerifiedUser } from '@/lib/auth/verified-user';

export const dynamic = 'force-dynamic';

/**
 * Whether the browser's login is a HOST login: it owns at least one venue. A Vibers guest login (the same account used
 * for guest sign-in on the menu and the Club) has no venue, so it is not a host, whatever its email. Not under /api/host
 * on purpose: a signed-out visitor is allowed to ask, and gets { signedIn: false }.
 */
export async function GET() {
  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return NextResponse.json({ signedIn: false, isHost: false });

  const { businesses, error } = await resolveHostBusinesses(user.id, supabase);
  if (error) return NextResponse.json({ error: 'Could not check host access.' }, { status: 503 });

  return NextResponse.json({
    signedIn: true,
    email: user.email ?? null,
    isHost: Array.isArray(businesses) && businesses.length > 0,
  });
}
