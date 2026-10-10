import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getVerifiedUser } from '@/lib/auth/verified-user';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Local JWT verification (see lib/auth/verified-user.ts); still refreshes an
  // expired session through the cookie handlers above.
  const user = await getVerifiedUser(supabase);

  const pathname = request.nextUrl.pathname;
  const isApiHostRoute = pathname.startsWith('/api/host');
  const isApiAdminRoute = pathname.startsWith('/api/admin');
  const isAdminPageRoute = pathname.startsWith('/admin');
  const isHostPageRoute = pathname.startsWith('/host');
  const isAuthRoute = pathname.startsWith('/auth/host');

  // 1. API Route Guards - return 401/403 JSON instead of redirecting
  // (No bypass for /api/host/provision: provisioning now always runs after a
  // real supabase.auth.signUp() on the onboarding page, which sets a real
  // session cookie, so it carries a real session like every other host route.)
  if (isApiHostRoute && !user) {
    return NextResponse.json(
      { error: 'Unauthorized: Host session required' },
      { status: 401 }
    );
  }

  if (isApiAdminRoute) {
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin session required' },
        { status: 401 }
      );
    }
    const isSuperAdmin = user.app_metadata?.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }
  }

  // 2. Admin Page Protection: non-admin sent to /auth/host
  if (isAdminPageRoute) {
    const isSuperAdmin = user?.app_metadata?.role === 'super_admin';
    if (!user || !isSuperAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/host';
      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      return redirectResponse;
    }
  }

  // 3. Host Page Protection
  // /onboarding/host is intentionally NOT gated here — a new host has no
  // session yet; the account is created as part of that flow (signUp), then
  // they're redirected into /host/** which IS gated below.
  if (!user && isHostPageRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/host';
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/host/control-center';
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
// Trigger middleware recompile for AsyncLocalStorage snapshot


export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
