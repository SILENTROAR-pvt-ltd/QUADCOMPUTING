'use client';

import { useState, useEffect, useCallback } from 'react';
import { ControlCenterTab } from '../ControlCenterHeader';
import { DEFAULT_LOCKS } from '@/lib/services/security/protected-modules';
import { markUnlocked, useSecurityStatus, type SecurityStatus } from './useSecurityStatus';

export type { SecurityStatus };

/** Which sections ask for the master PIN, the PIN pad, and locking or unlocking the session. */
export function useControlCenterSecurity(activeTab: ControlCenterTab, onTabSelect: (tab: ControlCenterTab) => void) {
  const { securityStatus, isMasterUnlocked, setIsMasterUnlocked } = useSecurityStatus();
  const [showGatekeeper, setShowGatekeeper] = useState(false);
  const [pendingLockedTab, setPendingLockedTab] = useState<ControlCenterTab | null>(null);

  const isTabProtected = useCallback((tabId: string) => {
    if (!securityStatus?.isAdminPinActive) return false;
    const key = tabId === 'analytics' ? 'dashboard' : tabId;
    // Every section can be locked; the server merges the saved choice over the defaults.
    const saved = securityStatus.protectedModules?.[key];
    return saved !== undefined ? Boolean(saved) : Boolean(DEFAULT_LOCKS[key]);
  }, [securityStatus]);

  // Gate the current section whenever it, the settings or the unlock state change.
  useEffect(() => {
    if (!isMasterUnlocked && isTabProtected(activeTab)) setShowGatekeeper(true);
  }, [activeTab, isMasterUnlocked, isTabProtected]);

  const handleUnlock = () => {
    markUnlocked(true);
    setIsMasterUnlocked(true);
    setShowGatekeeper(false);
    if (pendingLockedTab && pendingLockedTab !== activeTab) onTabSelect(pendingLockedTab);
    setPendingLockedTab(null);
  };

  const handleCancelUnlock = () => {
    setPendingLockedTab(null);
    if (!isTabProtected(activeTab) || isMasterUnlocked) { setShowGatekeeper(false); return; }
    // Leave the locked section for one open to staff; if every section is locked, stay on the PIN pad.
    const open = (['billing', 'kitchen', 'tables'] as ControlCenterTab[]).find((t) => !isTabProtected(t));
    if (open) { setShowGatekeeper(false); onTabSelect(open); }
  };

  const handleLockSession = () => {
    markUnlocked(false);
    setIsMasterUnlocked(false);
    if (isTabProtected(activeTab)) setShowGatekeeper(true);
  };

  /** The sidebar's "Unlock" button: ask for the master PIN without opening another section. */
  const handleUnlockRequest = () => {
    setPendingLockedTab(null);
    setShowGatekeeper(true);
  };

  return {
    securityStatus, isMasterUnlocked, showGatekeeper, isTabProtected,
    handleUnlock, handleCancelUnlock, handleLockSession, handleUnlockRequest, setPendingLockedTab, setShowGatekeeper,
  };
}
