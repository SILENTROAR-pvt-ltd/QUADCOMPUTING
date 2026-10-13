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
  // A signed-in login only counts if it already owns a venue, or it is the account this onboarding just created
  // (a retry after a failed provisioning). A Vibers guest login is never turned into a host by opening onboarding.
  const pendingId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('quad-new-host-user') : null;
  let reuse = false;
  if (!existingErr && existing.user) {
    if (existing.user.id === pendingId) {
      reuse = true;
    } else {
      const access = await fetch('/api/auth/host-access', { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
      reuse = Boolean(access?.isHost);
    }
  }

  if (!reuse) {
    // Clear any stale or guest session so this venue is created under its own host login.
    await supabase.auth.signOut();
    const { data: signUp, error: signUpError } = await supabase.auth.signUp({ email: data.email, password: data.password });
    if (signUpError) return { ok: false, error: friendlyAuthError(signUpError.message, 'We could not create your account. Please try again.') };
    // Supabase answers an email that already has an account with no identities, instead of an error.
    if (signUp.user && Array.isArray(signUp.user.identities) && signUp.user.identities.length === 0) {
      return { ok: false, error: 'This email already has a Vibers account. Use a different email for your venue login, or sign in to your host account.' };
    }
    if (!signUp.session) {
      // The project requires email confirmation before it issues a session.
      return { ok: false, error: 'Check your email to confirm your account, then sign in to finish setting up your venue.' };
    }
    if (signUp.user) sessionStorage.setItem('quad-new-host-user', signUp.user.id);
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
