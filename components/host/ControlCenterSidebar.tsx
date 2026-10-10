'use client';

import React from 'react';
import { CONTROL_CENTER_TABS, ControlCenterTab } from './ControlCenterHeader';
import { ChevronRight, Sparkles } from 'lucide-react';

interface ControlCenterSidebarProps {
  activeTab: ControlCenterTab;
  onTabChange: (tab: ControlCenterTab) => void;
  billRequestsCount?: number;
}

export function ControlCenterSidebar({
  activeTab,
  onTabChange,
  billRequestsCount = 0,
}: ControlCenterSidebarProps) {
  return (
    <aside
      aria-label="Host Control Navigation"
      className="hidden lg:flex lg:flex-col w-64 shrink-0 sticky top-20 pt-6"
    >
      <div className="rounded-2xl border border-neutral-200/80 bg-white/90 p-3 shadow-xs backdrop-blur-xl">
        {/* Subtle section header */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            Workspaces
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[9px] font-medium text-neutral-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>

        {/* Tab Items */}
        <nav className="mt-1 space-y-1">
          {CONTROL_CENTER_TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            const isBilling = id === 'billing';
            const hasPendingBills = isBilling && billRequestsCount > 0;
            const isKitchen = id === 'kitchen';

            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100/90 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? 'bg-neutral-800 text-white'
                        : 'bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200 group-hover:text-neutral-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="truncate">{label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {hasPendingBills && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-2xs ${
                        isActive
                          ? 'bg-sky-400 text-neutral-950 font-bold shadow-[0_0_10px_rgba(56,189,248,0.9)]'
                          : 'bg-sky-500 text-white animate-pulse shadow-[0_0_10px_rgba(14,165,233,0.7)]'
                      }`}
                      title={`${billRequestsCount} Pending Bill Request${billRequestsCount > 1 ? 's' : ''}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                      {billRequestsCount}
                    </span>
                  )}

                  {isKitchen && !hasPendingBills && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? 'bg-emerald-400' : 'bg-emerald-500'
                      }`}
                    />
                  )}

                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isActive
                        ? 'text-neutral-400 translate-x-0.5'
                        : 'text-neutral-300 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </nav>

        {/* Minimal Footer Info Card */}
        <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3">
          <div className="flex items-center gap-2 text-neutral-800 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-neutral-500" />
            <span>Quad POS v1.0</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500 leading-relaxed">
            Real-time table synchronization and kitchen dispatch engine active.
          </p>
        </div>
      </div>
    </aside>
  );
}
