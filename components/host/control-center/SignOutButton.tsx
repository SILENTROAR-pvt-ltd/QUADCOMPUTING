'use client';

import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
// Cleared on sign-out so the next account on this device never sees the previous venue's tables, menu or an unlocked
// master-admin PIN session.
import { clearHostCaches } from '@/lib/host/host-caches';

export function SignOutButton({ className = '' }: { className?: string }) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await createClient().auth.signOut();
    } catch (err) {
      console.error('[SignOut] Supabase sign-out failed; clearing local session anyway:', err);
    }
    clearHostCaches();
    // Full navigation (not router.push) so middleware sees the cleared cookies
    // and no host data stays in the React tree.
    window.location.replace('/auth/host');
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-700 text-xs font-medium hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all shadow-2xs cursor-pointer disabled:opacity-60 disabled:cursor-wait ${className}`}
    >
      <span>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
      <LogOut className="w-3.5 h-3.5" />
    </button>
  );
}
