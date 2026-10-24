'use client';

// Super-admin sign-in. A login counts only if the platform gave it role super_admin (set on the server, never by the
// app). The browser keeps one session, so a venue login open here has to sign out first. The middleware reads the role
// from the session token, so the token is renewed before the admin area opens.
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { friendlyAuthError } from '@/lib/auth/auth-messages';
import { clearHostCaches } from '@/lib/host/host-caches';

export interface AdminSession { email: string | null; isAdmin: boolean }

async function readSession(): Promise<AdminSession | null> {
  const { data } = await createClient().auth.getUser();
  return data.user ? { email: data.user.email ?? null, isAdmin: data.user.app_metadata?.role === 'super_admin' } : null;
}

export function useAdminSignIn(next: string) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    readSession().then((s) => { if (live) setSession(s); }).catch(() => {});
    return () => { live = false; };
  }, []);

  /** Renews the token (so it carries the role) and opens the admin area with a full load the middleware sees. */
  const openDesk = async () => {
    setBusy(true);
    try { await createClient().auth.refreshSession(); } catch { /* the middleware decides */ }
    window.location.replace(next);
  };

  const signIn = async (email: string, password: string) => {
    setError('');
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: failed } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (failed) { setError(friendlyAuthError(failed.message, 'Sign in failed. Check your email and password.')); return; }
      const s = await readSession();
      if (!s?.isAdmin) {
        await supabase.auth.signOut();
        setSession(null);
        setError('This login is not a super admin. Venue owners sign in at the venue login.');
        return;
      }
      clearHostCaches();
      window.location.replace(next);
    } catch (err: any) {
      setError(friendlyAuthError(err?.message));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    try { await createClient().auth.signOut(); } catch { /* local session cleared below */ }
    clearHostCaches();
    setSession(null);
    setBusy(false);
  };

  return { session, error, busy, signIn, signOut, openDesk };
}
