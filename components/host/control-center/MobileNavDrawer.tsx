'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { ControlCenterTab } from '../ControlCenterHeader';
import { useVisibleTabs } from './useVisibleTabs';
import { NavWorkspaceItem } from './NavWorkspaceItem';
import { MobileHeaderBar } from './MobileHeaderBar';
import { SignOutButton } from './SignOutButton';
import type { BillRequestItem } from './useBillRequests';
import type { SecurityStatus } from './useControlCenterSecurity';

interface MobileNavDrawerProps {
  activeTab: ControlCenterTab;
  onTabChange: (tab: ControlCenterTab) => void;
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;
  securityStatus: SecurityStatus | null;
  isMasterUnlocked: boolean;
  isTabProtected: (tabId: string) => boolean;
  onLockSession: () => void;
  onUnlockRequest: () => void;
  billRequests: BillRequestItem[];
  venueName: string;
  venueId: string;
  onOpenCopilot?: () => void;
}

export function MobileNavDrawer({
  activeTab,
  onTabChange,
  mobileDrawerOpen,
  setMobileDrawerOpen,
  securityStatus,
  isMasterUnlocked,
  isTabProtected,
  onLockSession,
  onUnlockRequest,
  billRequests,
  venueName,
  venueId,
  onOpenCopilot,
}: MobileNavDrawerProps) {
  const { tabs } = useVisibleTabs();

  return (
    <>
      <MobileHeaderBar
        activeTab={activeTab}
        onOpenDrawer={() => setMobileDrawerOpen(true)}
        securityStatus={securityStatus}
        isMasterUnlocked={isMasterUnlocked}
        onLockSession={onLockSession}
        onUnlockRequest={onUnlockRequest}
        billRequests={billRequests}
        onBillingClick={() => onTabChange('billing')}
        venueName={venueName}
        venueId={venueId}
        onOpenCopilot={onOpenCopilot}
      />

      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[80%] bg-white h-full shadow-2xl flex flex-col z-10 border-r border-neutral-200 animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm tracking-tight text-neutral-900 block font-sans">
                  Host Workspaces
                </span>
                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
                  Quad Computing
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-1">
              {tabs.map((item) => (
                <NavWorkspaceItem
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  icon={item.icon}
                  isActive={activeTab === item.id || (item.id === 'dashboard' && (activeTab as string) === 'analytics')}
                  isProtected={isTabProtected(item.id)}
                  isMasterUnlocked={isMasterUnlocked}
                  badgeCount={item.id === 'billing' ? billRequests.length : 0}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileDrawerOpen(false);
                  }}
                />
              ))}
            </div>

            <div className="p-4 border-t border-neutral-100 space-y-2.5">
              <SignOutButton />
              <p className="text-[11px] text-neutral-400 text-center font-mono">
                Venue ID: {venueId.slice(0, 8)}...{venueId.slice(-4)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
