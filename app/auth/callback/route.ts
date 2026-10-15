import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { AUTH_NEXT_COOKIE, safeNextPath, withAuthMarker } from '@/lib/auth/safe-next';

export const dynamic = 'force-dynamic';

/**
 * Google sign-in lands here with ?code=. The code is exchanged for a session (cookies), then the guest is sent
 * back to the page they left (same table, same venue) with ?auth=google so the sheet can finish their profile.
 * The return path comes from a cookie the browser set before leaving, and only a same-site path is accepted.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const next = safeNextPath(jar.get(AUTH_NEXT_COOKIE)?.value, '/');
  const code = url.searchParams.get('code');

  let marker = 'google';
  if (!code || url.searchParams.get('error')) {
    marker = 'failed';
  } else {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('[Auth Callback] code exchange failed', { message: error.message });
        marker = 'failed';
      }
    } catch (error) {
      console.error('[Auth Callback] unexpected failure', error);
      marker = 'failed';
    }
  }

  const response = NextResponse.redirect(new URL(withAuthMarker(next, marker), url.origin));
  response.cookies.set(AUTH_NEXT_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
