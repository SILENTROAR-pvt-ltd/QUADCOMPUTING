import { createClient } from '@/lib/supabase/client';
import { friendlyAuthError } from '@/lib/auth/auth-messages';
import { clearHostCaches } from '@/lib/host/host-caches';
import type { HostOnboardingForm } from '@/lib/validations/onboarding';

export type CreateResult = { ok: true; url: string } | { ok: false; error: string };

const sameEmail = (a: string | null | undefined, b: string) => Boolean(a) && a!.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Whether the login already signed in on this browser should own the new venue. Only when the person typed that
 * login's own email: a retry of this sign-up, or an owner adding another venue to their account. Anyone else signed in
 * (an owner who left the console open on a shared device, a guest's Vibers login) never gets a venue attached to their
 * account by someone filling in this form; the form's own email and password are used instead.
 */
async function reuseSignedIn(user: { id: string; email?: string | null }, email: string): Promise<boolean> {
  if (!sameEmail(user.email, email)) return false;
  const pendingId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('quad-new-host-user') : null;
  if (user.id === pendingId) return true;
  const access = await fetch('/api/auth/host-access', { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
  return Boolean(access?.isHost);
}

/**
 * Creates the host's account (unless the browser is already signed in to that same account), then provisions their
 * venues under it.
 */
export async function createHostAccount(data: HostOnboardingForm): Promise<CreateResult> {
  const supabase = createClient();

  // getUser(), not getSession(): a cached session can outlive a deleted account, which then made
  // provisioning fail with a confusing 401.
  const { data: existing, error: existingErr } = await supabase.auth.getUser();
  const reuse = !existingErr && existing.user ? await reuseSignedIn(existing.user, data.email) : false;

  if (!reuse) {
    // A different account (or a stale session) is signed out, and everything it left in this browser goes with it.
    await supabase.auth.signOut();
    clearHostCaches();
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
    // The reference (a database code and rule name, never the host's data) lets support see what refused the set-up.
    const ref = typeof provisioning?.ref === 'string' && provisioning.ref ? ` (ref ${provisioning.ref})` : '';
    return { ok: false, error: `${provisioning?.error || 'We could not set up your venue. Please try again.'}${ref}` };
  }
  sessionStorage.setItem('quad-provisioning', JSON.stringify(provisioning));
  return { ok: true, url: provisioning.controlCenterUrl || provisioning.dashboardUrl || '/host/control-center' };
}
