'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clubFetch } from './api';
import { usePresence } from './usePresence';

export interface ClubMe {
  signedIn: boolean;
  user?: { id: string; email: string | null };
  viberId?: string | null;
  staffRole?: 'club_admin' | 'super_admin' | null;
  unreadNotifications?: number;
  profile?: Record<string, any> | null;
}

type State = { status: 'loading' } | { status: 'error'; error: string; code?: string } | { status: 'ready'; me: ClubMe };
type Session = { state: State; refresh: () => Promise<void> };

const SessionCtx = createContext<Session | null>(null);
const Ctx = createContext<{ me: ClubMe; refresh: () => Promise<void> } | null>(null);

/** Loads who is signed in (the shared Vibers login) and their Club membership. */
function useLoader(enabled: boolean): Session {
  const [state, setState] = useState<State>({ status: 'loading' });
  const refresh = useCallback(async () => {
    const res = await clubFetch<ClubMe>('/me');
    setState((prev) => {
      if (res.ok) return { status: 'ready', me: res.data };
      // A blip on a background re-check keeps the page as it was instead of replacing it with an error.
      if (prev.status === 'ready' && (res.status === 0 || res.status >= 500)) return prev;
      return { status: 'error', error: res.error, code: res.code };
    });
  }, []);
  useEffect(() => { if (enabled) void refresh(); }, [enabled, refresh]);
  return { state, refresh };
}

/**
 * One session for every Vibers Club page: loaded once, kept across page changes (no spinner on each
 * tab), re-checked when the tab comes back into view, and running live presence for approved members.
 */
export function ClubSessionProvider({ children }: { children: React.ReactNode }) {
  const session = useLoader(true);
  const { state, refresh } = session;
  useEffect(() => {
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 30_000) return;
      last = Date.now();
      void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);
  usePresence(state.status === 'ready' && state.me.profile?.status === 'approved');
  return <SessionCtx.Provider value={session}>{children}</SessionCtx.Provider>;
}

/** The shared session when inside the Club layout; a page of its own otherwise. */
export function useClubMeLoader(): Session {
  const shared = useContext(SessionCtx);
  const own = useLoader(!shared);
  return shared ?? own;
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
