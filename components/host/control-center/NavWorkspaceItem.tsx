'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import type { ControlCenterTab } from '../ControlCenterHeader';

interface NavWorkspaceItemProps {
  id: ControlCenterTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  isProtected: boolean;
  isMasterUnlocked: boolean;
  badgeCount: number;
  glowDot?: boolean;
  /** Guest calls waiting in this workspace: a green pulse on the icon and the count beside the name. */
  alertCount?: number;
  onClick: () => void;
}

export function NavWorkspaceItem({
  label,
  icon: Icon,
  isActive,
  isProtected,
  isMasterUnlocked,
  badgeCount,
  glowDot = false,
  alertCount = 0,
  onClick,
}: NavWorkspaceItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
        isActive
          ? 'bg-neutral-900 text-white font-semibold shadow-xs'
          : alertCount > 0
            // A guest is waiting here: the whole row glows, not only a dot.
            ? 'bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-300 shadow-[0_0_0_4px_rgba(16,185,129,0.12)] hover:bg-emerald-100'
            : 'text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900 font-medium'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Icon wrapper with relative positioning so glow dot can sit on top-right corner */}
        <div className="relative shrink-0">
          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : alertCount > 0 ? 'text-emerald-700' : 'text-neutral-400'}`} />
          {/* 🔴 Glow dot: NEW ORDER notification */}
          {(glowDot || alertCount > 0) && (
            <span
              className="absolute -top-1 -right-1 flex h-2.5 w-2.5"
              aria-label={alertCount > 0 ? `${alertCount} guest request${alertCount === 1 ? '' : 's'} waiting` : 'New order received'}
            >
              {/* Ping ring */}
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${alertCount > 0 ? 'bg-emerald-400' : 'bg-orange-400'}`} />
              {/* Solid core */}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${alertCount > 0 ? 'bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.7)]' : 'bg-orange-500 shadow-[0_0_6px_2px_rgba(249,115,22,0.7)]'}`} />
            </span>
          )}
        </div>
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isProtected && (
          <span
            className={`inline-flex items-center transition-colors ${
              isMasterUnlocked ? 'text-emerald-500' : 'text-neutral-400'
            }`}
            title={isMasterUnlocked ? 'Master Access Unlocked' : 'Protected by Master PIN'}
          >
            <Lock className="w-3.5 h-3.5" />
          </span>
        )}
        {alertCount > 0 && (
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-emerald-400 text-neutral-950' : 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.6)]'}`} title="Guest requests waiting">
            {alertCount}
          </span>
        )}
        {badgeCount > 0 && (
          <span
            className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isActive
                ? 'bg-sky-400 text-neutral-950 shadow-[0_0_10px_rgba(56,189,248,0.9)]'
                : 'bg-sky-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.7)]'
            }`}
          >
            {badgeCount}
          </span>
        )}
      </div>
    </button>
  );
}
