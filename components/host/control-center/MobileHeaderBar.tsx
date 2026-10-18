'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, ExternalLink, BellRing } from 'lucide-react';
import { CONTROL_CENTER_TABS, ControlCenterTab } from '../ControlCenterHeader';
import { MasterSessionControl } from './MasterSessionControl';
import { CopilotButton } from '@/components/host/vibey/CopilotButton';
import type { BillRequestItem } from './useBillRequests';
import type { SecurityStatus } from './useControlCenterSecurity';

interface MobileHeaderBarProps {
  activeTab: ControlCenterTab;
  onOpenDrawer: () => void;
  securityStatus: SecurityStatus | null;
  isMasterUnlocked: boolean;
  onLockSession: () => void;
  onUnlockRequest: () => void;
  billRequests: BillRequestItem[];
  onBillingClick: () => void;
  venueName: string;
  venueId: string;
  onOpenCopilot?: () => void;
}

export function MobileHeaderBar({
  activeTab,
  onOpenDrawer,
  securityStatus,
  isMasterUnlocked,
  onLockSession,
  onUnlockRequest,
  billRequests,
  onBillingClick,
  venueName,
  venueId,
  onOpenCopilot,
}: MobileHeaderBarProps) {
  return (
    <header className="lg:hidden sticky top-0 z-40 w-full bg-white/95 border-b border-neutral-200/80 px-4 py-3 flex items-center justify-between backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenDrawer}
          className="p-2 rounded-xl bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
          aria-label="Open navigation drawer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-semibold text-neutral-950 truncate max-w-[180px] sm:max-w-xs font-sans">
            {venueName}
          </h2>
          <p className="font-mono text-[10px] text-neutral-400">
            {CONTROL_CENTER_TABS.find((t) => t.id === activeTab)?.label || 'Workspace'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onOpenCopilot && <CopilotButton compact onOpen={onOpenCopilot} />}
        {securityStatus?.isAdminPinActive && (
          <MasterSessionControl compact unlocked={isMasterUnlocked} onLock={onLockSession} onUnlock={onUnlockRequest} />
        )}
        {billRequests.length > 0 && (
          <button
            type="button"
            onClick={onBillingClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-950 border border-sky-300 text-[11px] font-semibold shadow-[0_0_12px_rgba(14,165,233,0.35)] ring-1 ring-sky-200/50"
          >
            <BellRing className="w-3 h-3 text-sky-600 animate-bounce drop-shadow-[0_0_4px_rgba(14,165,233,0.6)]" />
            <span>{billRequests.length}</span>
          </button>
        )}
        <Link
          href={`/menu?cafe_id=${venueId}&table=T-01`}
          target="_blank"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-900 text-white text-xs font-medium"
        >
          <span>Menu</span>
          <ExternalLink className="w-3 h-3 text-neutral-400" />
        </Link>
      </div>
    </header>
  );
}
