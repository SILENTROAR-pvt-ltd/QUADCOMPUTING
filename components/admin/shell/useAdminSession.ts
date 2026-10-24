'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { clearHostCaches } from '@/lib/host/host-caches';

/** The signed-in super admin (email, last sign-in) and signing out, here or on every device. */
export function useAdminSession() {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let live = true;
    createClient().auth.getUser().then(({ data }) => {
      if (!live) return;
      const meta = data.user?.user_metadata || {};
      setEmail(data.user?.email ?? null);
      // First name from the login's profile name when it has one; otherwise the welcome has no name rather than a guess.
      setName(String(meta.full_name || meta.name || '').trim().split(/\s+/)[0] || null);
      setLastSignIn(data.user?.last_sign_in_at ?? null);
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  const signOut = async (scope: 'local' | 'global' = 'local') => {
    setLeaving(true);
    try { await createClient().auth.signOut({ scope }); } catch { /* local session cleared below */ }
    clearHostCaches();
    window.location.replace('/auth/admin');
  };

  return { email, name, lastSignIn, leaving, signOut };
}
