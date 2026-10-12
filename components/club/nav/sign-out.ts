'use client';

import { createClient } from '@/lib/supabase/client';

/** Leaves live presence at once, ends the shared Vibers session on this device, back to the landing. */
export async function signOutOfClub() {
  try { navigator.sendBeacon?.('/api/club/presence/leave'); } catch {}
  await createClient().auth.signOut({ scope: 'local' }).catch(() => {});
  window.location.href = '/join';
}
