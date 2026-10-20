import { NextResponse } from 'next/server';

/**
 * Admin routes can require a TOTP-verified session (Supabase AAL2). It is off by default: the app has no enrolment or
 * step-up screen yet, so switching it on before a super admin has enrolled and verified a factor would lock every admin
 * out. Set ADMIN_REQUIRE_AAL2=1 once that is in place.
 */
export function adminRequiresAal2(env: Record<string, string | undefined> = process.env): boolean {
  return env.ADMIN_REQUIRE_AAL2 === '1';
}

/** A 403 when AAL2 is required and the session is not at that level; null when the request may continue. */
export async function adminAal2Failure(supabase: any, env: Record<string, string | undefined> = process.env): Promise<NextResponse | null> {
  if (!adminRequiresAal2(env)) return null;
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!error && data?.currentLevel === 'aal2') return null;
  } catch { /* an unreadable level is treated as not verified */ }
  return NextResponse.json(
    { error: 'MFA_REQUIRED: this admin session needs a TOTP code', code: 'AAL2_REQUIRED' },
    { status: 403 },
  );
}
