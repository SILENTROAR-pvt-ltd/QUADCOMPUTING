'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clubFetch } from './api';

export interface ClubMe {
  signedIn: boolean;
  user?: { id: string; email: string | null };
  viberId?: string | null;
  staffRole?: 'club_admin' | 'super_admin' | null;
  unreadNotifications?: number;
  profile?: Record<string, any> | null;
}

type State = { status: 'loading' } | { status: 'error'; error: string; code?: string } | { status: 'ready'; me: ClubMe };

const Ctx = createContext<{ me: ClubMe; refresh: () => Promise<void> } | null>(null);

/** Loads who is signed in (the shared Vibers login) and their Club membership. */
export function useClubMeLoader() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const refresh = useCallback(async () => {
    const res = await clubFetch<ClubMe>('/me');
    setState(res.ok ? { status: 'ready', me: res.data } : { status: 'error', error: res.error, code: res.code });
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { state, refresh };
}

export function ClubProvider({ me, refresh, children }: { me: ClubMe; refresh: () => Promise<void>; children: React.ReactNode }) {
  return <Ctx.Provider value={{ me, refresh }}>{children}</Ctx.Provider>;
}

/** The signed-in, approved member (inside ClubShell). */
export function useClub() {
  const value = useContext(Ctx);
  if (!value) throw new Error('useClub must be used inside ClubShell');
  return value;
}
