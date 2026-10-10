import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminDb } from '@/lib/supabase/admin';
import { getVerifiedUser } from './verified-user';
import type { User, SupabaseClient } from '@supabase/supabase-js';

export { adminDb };

export interface AuthHostSuccess {
  user: User;
  businessId: string;
  business: any;
  businesses: any[];
  supabase: SupabaseClient;
  error?: null;
}

export interface AuthHostFailure {
  error: NextResponse;
  user?: null;
  businessId?: null;
  business?: null;
  businesses?: null;
  supabase?: null;
}

export type AuthHostResult = AuthHostSuccess | AuthHostFailure;

export interface AuthAdminSuccess {
  user?: User | null;
  adminId: string;
  supabase: SupabaseClient;
  error?: null;
}

export interface AuthAdminFailure {
  error: NextResponse;
  user?: null;
  adminId?: null;
  supabase?: null;
}

export type AuthAdminResult = AuthAdminSuccess | AuthAdminFailure;

/**
 * resolveHostBusinesses()
 * Single source of truth for "which businesses does this user own" —
 * tries the admin (service-role) client first, falls back to the user's own
 * client if the admin lookup errored or came back empty. Used by both
 * requireHost() (API routes) and hostRepository.load() (server-rendered
 * Control Center page), so the two can never disagree about whether a host
 * has a business yet.
 */
export async function resolveHostBusinesses(
  userId: string,
  userSupabase: SupabaseClient
): Promise<{ businesses: any[]; error: any }> {
  const admin = adminDb();
  let rawBusinesses: any[] | null = null;
  let bizError: any = null;

  try {
    const res = await admin
      .from('businesses')
      .select('*')
      .eq('host_id', userId)
      .order('created_at', { ascending: false });
    rawBusinesses = res.data;
    bizError = res.error;
  } catch (err: any) {
    bizError = err;
  }

  // Try fallback to user supabase client if admin had permission issue or returned empty
  if (bizError || !rawBusinesses || rawBusinesses.length === 0) {
    try {
      const userRes = await userSupabase
        .from('businesses')
        .select('*')
        .eq('host_id', userId)
        .order('created_at', { ascending: false });
      if (!userRes.error && userRes.data && userRes.data.length > 0) {
        rawBusinesses = userRes.data;
        bizError = null;
      }
    } catch {}
  }

  const businesses = (rawBusinesses || []).map((b: any) => ({
    ...b,
    name: b.business_name || b.name || 'Venue',
    business_name: b.business_name || b.name || 'Venue',
  }));

  return { businesses, error: bizError };
}

/**
 * requireHost()
 * Guard for all /api/host/** route handlers.
 * Verifies that the caller has a valid authenticated session
 * and owns the requested or primary business.
 * business_id comes strictly from this guard.
 */
export async function requireHost(
  request?: Request,
  explicitBusinessId?: string | null,
  options?: { allowNoBusiness?: boolean }
): Promise<AuthHostResult> {
  try {
    const supabase = await createClient();
    const user = await getVerifiedUser(supabase);

    // `allowNoBusiness` means "an authenticated user who doesn't have a
    // business YET is fine" (e.g. provisioning) — it does not mean "no
    // session is fine." A fake, non-existent user id used to be fabricated
    // here, which silently failed every downstream insert that has a
    // foreign key into auth.users (profiles.id, and transitively
    // businesses.host_id) and could never be resolved again on a later visit.
    if (!user) {
      return {
        error: NextResponse.json(
          { error: 'Unauthorized: Host authentication required' },
          { status: 401 }
        ),
      };
    }

    const { businesses, error: bizError } = await resolveHostBusinesses(user.id, supabase);

    if (bizError && !options?.allowNoBusiness) {
      return {
        error: NextResponse.json(
          { error: `Database error resolving business: ${bizError.message || 'Query failed'}` },
          { status: 500 }
        ),
      };
    }

    if (!businesses || businesses.length === 0) {
      if (options?.allowNoBusiness) {
        return {
          user,
          businessId: '',
          business: null,
          businesses: [],
          supabase,
          error: null,
        };
      }
      return {
        error: NextResponse.json(
          { error: 'Forbidden: No business associated with this host' },
          { status: 403 }
        ),
      };
    }

    let candidateBizId = explicitBusinessId || null;
    if (!candidateBizId && request) {
      try {
        const url = new URL(request.url);
        candidateBizId =
          url.searchParams.get('business_id') ||
          url.searchParams.get('businessId') ||
          url.searchParams.get('venue_id') ||
          url.searchParams.get('venueId');
      } catch {
        // request.url may be relative or non-URL
      }
    }

    let targetBusiness = businesses[0];
    if (candidateBizId) {
      const match = businesses.find((b: any) => b.id === candidateBizId);
      if (!match) {
        return {
          error: NextResponse.json(
            { error: 'Forbidden: You do not have access to this business' },
            { status: 403 }
          ),
        };
      }
      targetBusiness = match;
    }

    return {
      user,
      businessId: targetBusiness.id,
      business: targetBusiness,
      businesses,
      supabase,
      error: null,
    };
  } catch (err: any) {
    return {
      error: NextResponse.json(
        { error: err?.message || 'Authentication error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * requireAdmin()
 * Guard for all /api/admin/** route handlers.
 * Verifies that the caller has a valid authenticated Supabase session
 * AND user.app_metadata.role === 'super_admin'.
 * No header/env shared secrets, no fallback literals.
 */
export async function requireAdmin(request?: Request): Promise<AuthAdminResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: NextResponse.json(
          { error: 'Unauthorized: Admin session required' },
          { status: 401 }
        ),
      };
    }

    const isSuperAdmin = user.app_metadata?.role === 'super_admin';

    if (!isSuperAdmin) {
      return {
        error: NextResponse.json(
          { error: 'Forbidden: Super admin access required' },
          { status: 403 }
        ),
      };
    }

    return {
      user,
      adminId: user.id,
      supabase,
      error: null,
    };
  } catch (err: any) {
    return {
      error: NextResponse.json(
        { error: err?.message || 'Admin authentication error' },
        { status: 500 }
      ),
    };
  }
}
