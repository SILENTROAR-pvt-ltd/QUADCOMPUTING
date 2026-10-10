import type { SupabaseClient, User } from '@supabase/supabase-js';

// The project signs access tokens with asymmetric (ES256) keys, so getClaims()
// verifies the JWT signature locally against the cached JWKS instead of calling
// the Auth server — one ~270 ms round trip saved on every request that runs it
// (middleware and requireHost both did, back to back).
//
// Trade-off: a session revoked server-side stays usable until its access token
// expires (default 1 h). Privileged admin routes keep the network getUser()
// check; see requireAdmin().
//
// Kept free of server-only imports so middleware (edge runtime) can use it.
export async function getVerifiedUser(supabase: SupabaseClient): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!error && claims?.sub) {
      return {
        id: claims.sub,
        email: claims.email,
        phone: claims.phone,
        role: claims.role,
        aud: Array.isArray(claims.aud) ? claims.aud[0] : claims.aud,
        app_metadata: claims.app_metadata ?? {},
        user_metadata: claims.user_metadata ?? {},
        is_anonymous: claims.is_anonymous,
        created_at: '',
      } as User;
    }
    // No session at all: nothing to verify, skip the network call.
    if (!error && !claims) return null;
    if (error?.name === 'AuthSessionMissingError') return null;
    // Any other error (e.g. JWKS unreachable, bad token) → let the Auth server decide.
  } catch {
    // fall through to the network check
  }
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}
