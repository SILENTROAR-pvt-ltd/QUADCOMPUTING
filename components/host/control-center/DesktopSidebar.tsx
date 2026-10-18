'use client';

import React from 'react';
import type { ControlCenterTab } from '../ControlCenterHeader';
import { useVisibleTabs } from './useVisibleTabs';
import { NavWorkspaceItem } from './NavWorkspaceItem';
import { SidebarHeader } from './SidebarHeader';
import { SidebarFooter } from './SidebarFooter';
import { CopilotButton } from '@/components/host/vibey/CopilotButton';
import type { BillRequestItem } from './useBillRequests';
import type { SecurityStatus } from './useControlCenterSecurity';

interface DesktopSidebarProps {
  activeTab: ControlCenterTab;
  onTabChange: (tab: ControlCenterTab) => void;
  securityStatus: SecurityStatus | null;
  isMasterUnlocked: boolean;
  isTabProtected: (tabId: string) => boolean;
  onLockSession: () => void;
  onUnlockRequest: () => void;
  billRequests: BillRequestItem[];
  venueName: string;
  venueId: string;
  pendingKotCount?: number;
  /** Opens the Vibey co-pilot; absent while the venue does not have it. */
  onOpenCopilot?: () => void;
}

export function DesktopSidebar({
  activeTab,
  onTabChange,
  securityStatus,
  isMasterUnlocked,
  isTabProtected,
  onLockSession,
  onUnlockRequest,
  billRequests,
  venueName,
  venueId,
  pendingKotCount = 0,
  onOpenCopilot,
}: DesktopSidebarProps) {
  const { tabs } = useVisibleTabs();

  return (
    <aside className="sticky top-0 z-40 hidden h-screen w-72 shrink-0 select-none flex-col justify-between self-start border-r border-neutral-200/80 bg-white lg:flex">
      <div className="flex min-h-0 flex-1 flex-col">
        <SidebarHeader
          venueName={venueName}
          venueId={venueId}
          masterPinOn={Boolean(securityStatus?.isAdminPinActive)}
          unlocked={isMasterUnlocked}
          onLock={onLockSession}
          onUnlock={onUnlockRequest}
        />
        {onOpenCopilot && <CopilotButton onOpen={onOpenCopilot} />}
        <nav aria-label="Host workspaces" className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto p-3">
          <p className="px-3.5 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Workspaces</p>
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
              glowDot={item.id === 'kitchen' && pendingKotCount > 0}
              onClick={() => onTabChange(item.id)}
            />
          ))}
        </nav>
      </div>
      <SidebarFooter billRequests={billRequests} venueId={venueId} onBilling={() => onTabChange('billing')} />
    </aside>
  );
}
