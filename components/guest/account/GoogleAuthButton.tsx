'use client';

import React, { useEffect, useState } from 'react';
import { signInWithGoogle } from '@/lib/guest/guest-account-client';
import { FormError } from './AuthFields';

let availability: Promise<boolean> | null = null;

/**
 * Asks Supabase whether Google sign-in is switched on for this project (its public settings endpoint). If it is not, the
 * button is not shown: tapping it would strand the guest on a raw error page at Supabase. Any failure counts as "not
 * available". Asked once per page load.
 */
function googleIsEnabled(): Promise<boolean> {
  if (!availability) {
    availability = fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => settings?.external?.google === true)
      .catch(() => false);
  }
  return availability;
}

/** "Continue with Google", then an OR divider. Leaves the page for Google and returns through /auth/callback. */
export function GoogleAuthButton() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    void googleIsEnabled().then((ok) => { if (live) setEnabled(ok); });
    return () => { live = false; };
  }, []);

  if (!enabled) return null;

  const go = async () => {
    setError('');
    setBusy(true);
    const result = await signInWithGoogle();
    // On success the browser is already on its way to Google; stay "busy" so a second tap does nothing.
    if (!result.ok) { setBusy(false); setError(result.error); }
  };

  return (
    <div className="pt-4">
      <button
        type="button" onClick={go} disabled={busy}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-zinc-300 bg-white py-3 text-sm font-semibold text-zinc-900 shadow-xs transition-all hover:bg-zinc-50 active:scale-[0.98] cursor-pointer disabled:cursor-wait disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.2-3.9 7.2-9.6 7.2-16.9z" />
          <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.6 2.3-8.8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {busy ? 'Opening Google…' : 'Continue with Google'}
      </button>
      <FormError message={error} />
      <div className="mt-4 flex items-center gap-3" role="separator" aria-label="or">
        <span className="h-px flex-1 bg-zinc-200" />
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">or</span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>
    </div>
  );
}

export default GoogleAuthButton;
