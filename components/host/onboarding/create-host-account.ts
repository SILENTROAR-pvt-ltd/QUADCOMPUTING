import { createClient } from '@/lib/supabase/client';
import { friendlyAuthError } from '@/lib/auth/auth-messages';
import type { HostOnboardingForm } from '@/lib/validations/onboarding';

export type CreateResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Creates the host's account (unless the browser is already signed in to a user that still exists),
 * then provisions their venues under it.
 */
export async function createHostAccount(data: HostOnboardingForm): Promise<CreateResult> {
  const supabase = createClient();

  // getUser(), not getSession(): a cached session can outlive a deleted account, which then made
  // provisioning fail with a confusing 401.
  const { data: existing, error: existingErr } = await supabase.auth.getUser();
  if (existingErr || !existing.user) {
    // Clear any stale local session so a leftover cookie from a deleted account can't interfere.
    await supabase.auth.signOut();
    const { data: signUp, error: signUpError } = await supabase.auth.signUp({ email: data.email, password: data.password });
    if (signUpError) return { ok: false, error: friendlyAuthError(signUpError.message, 'We could not create your account. Please try again.') };
    if (!signUp.session) {
      // The project requires email confirmation before it issues a session.
      return { ok: false, error: 'Check your email to confirm your account, then sign in to finish setting up your venue.' };
    }
  }

  const response = await fetch('/api/host/provision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const provisioning = await response.json().catch(() => null);
  if (!response.ok || !provisioning?.success) {
    return { ok: false, error: provisioning?.error || 'We could not set up your venue. Please try again.' };
  }
  sessionStorage.setItem('quad-provisioning', JSON.stringify(provisioning));
  return { ok: true, url: provisioning.controlCenterUrl || provisioning.dashboardUrl || '/host/control-center' };
}
