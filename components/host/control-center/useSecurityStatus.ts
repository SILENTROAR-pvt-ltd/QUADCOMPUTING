'use client';

import { useCallback, useEffect, useState } from 'react';

export interface SecurityStatus {
  isAdminPinActive: boolean;
  protectedModules: Record<string, boolean>;
}

const UNLOCK_KEY = 'master_admin_unlocked';
export const markUnlocked = (on: boolean) => (on ? sessionStorage.setItem(UNLOCK_KEY, 'true') : sessionStorage.removeItem(UNLOCK_KEY));

/**
 * The venue's PIN settings and whether this browser session has entered the master PIN.
 * Loaded once per page, again on `master_admin_lock` (which also locks the session) and on
 * `master_admin_refresh` (settings changed in the profile; the session state is re-read).
 */
export function useSecurityStatus() {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [isMasterUnlocked, setIsMasterUnlocked] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/host/security/status', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) setSecurityStatus(await res.json());
    } catch { /* keep the last known settings */ }
  }, []);

  useEffect(() => {
    const readSession = () => setIsMasterUnlocked(sessionStorage.getItem(UNLOCK_KEY) === 'true');
    readSession();
    void fetchStatus();
    const onLock = () => { markUnlocked(false); readSession(); void fetchStatus(); };
    const onRefresh = () => { readSession(); void fetchStatus(); };
    window.addEventListener('master_admin_lock', onLock);
    window.addEventListener('master_admin_refresh', onRefresh);
    return () => {
      window.removeEventListener('master_admin_lock', onLock);
      window.removeEventListener('master_admin_refresh', onRefresh);
    };
  }, [fetchStatus]);

  return { securityStatus, isMasterUnlocked, setIsMasterUnlocked };
}
