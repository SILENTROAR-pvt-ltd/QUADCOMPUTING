'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { friendlyAuthError } from '@/lib/auth/auth-messages';

/** What a new super-admin password must meet. Empty list = good. */
export function passwordProblems(next: string, current: string, confirm: string): string[] {
  const out: string[] = [];
  if (next.length < 12) out.push('At least 12 characters');
  if (!/[a-z]/i.test(next) || !/\d/.test(next)) out.push('Letters and numbers');
  if (!/[^a-z0-9]/i.test(next)) out.push('At least one symbol');
  if (next && next === current) out.push('Different from your current password');
  if (confirm && next !== confirm) out.push('Both new passwords match');
  return out;
}

/**
 * Changing the super-admin password: the current password is checked first (a fresh sign-in, which also satisfies
 * Supabase's recent-login rule), then the new one is set. Other devices can be signed out in the same step.
 */
export function usePasswordChange() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const change = async (current: string, next: string, signOutOthers: boolean) => {
    setBusy(true);
    setResult(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) { setResult({ ok: false, text: 'Your session has ended. Sign in again.' }); return false; }
      const check = await supabase.auth.signInWithPassword({ email, password: current });
      if (check.error) { setResult({ ok: false, text: 'Your current password is not right.' }); return false; }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) { setResult({ ok: false, text: friendlyAuthError(error.message, 'The password could not be changed. Try a different one.') }); return false; }
      if (signOutOthers) await supabase.auth.signOut({ scope: 'others' }).catch(() => {});
      setResult({ ok: true, text: signOutOthers ? 'Password changed. Every other device has been signed out.' : 'Password changed.' });
      return true;
    } catch (err: any) {
      setResult({ ok: false, text: friendlyAuthError(err?.message) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, result, change };
}
