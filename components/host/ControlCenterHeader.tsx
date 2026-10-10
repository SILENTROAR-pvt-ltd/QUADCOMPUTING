'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  CreditCard,
  ChefHat,
  BookOpen,
  BedDouble,
  Boxes,
  ReceiptText,
  TrendingUp,
  UserRound,
  Wallet,
  Menu,
  X,
  ExternalLink,
  BellRing,
  LayoutGrid,
} from 'lucide-react';

export type ControlCenterTab =
  | 'billing'
  | 'tables'
  | 'kitchen'
  | 'catalog'
  | 'accommodations'
  | 'inventory'
  | 'expenses'
  | 'dashboard'
  | 'wallet'
  | 'profile';

export const CONTROL_CENTER_TABS = [
  { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'wallet', label: 'Subscription & Wallet', icon: Wallet },
  { id: 'dashboard', label: 'Analytics & COGS', icon: TrendingUp },
  { id: 'catalog', label: 'Menu Catalog', icon: BookOpen },
  { id: 'billing', label: 'Billing & Tables', icon: CreditCard },
  { id: 'tables', label: 'Live Tables', icon: LayoutGrid },
  { id: 'accommodations', label: 'Accommodations', icon: BedDouble },
  { id: 'kitchen', label: 'Live Kitchen (KOT)', icon: ChefHat },
  { id: 'inventory', label: 'Raw Inventory', icon: Boxes },
  { id: 'expenses', label: 'Staff & Expenses', icon: ReceiptText },
] satisfies Array<{ id: ControlCenterTab; label: string; icon: React.FC<{ className?: string }> }>;

export interface ControlCenterHeaderProps {
  activeTab?: ControlCenterTab;
  onTabChange?: (tab: ControlCenterTab) => void;
  venueName?: string;
  venueId?: string;
  billRequests?: Array<{ tableNumber: string; subtotal: number }>;
  pendingBillsCount?: number;
}

export function ControlCenterHeader({
  activeTab: propActiveTab,
  onTabChange,
  venueName = 'Venue',
  venueId = '',
  billRequests = [],
  pendingBillsCount,
}: ControlCenterHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Resolve active tab from prop or URL query param
  const activeTab = (propActiveTab || (searchParams.get('tab') as ControlCenterTab) || 'billing') as ControlCenterTab;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Compute bill alert numbers
  const effectiveBillCount = billRequests.length > 0 ? billRequests.length : (pendingBillsCount ?? 0);
  const effectiveBillTotal = billRequests.reduce((sum, r) => sum + r.subtotal, 0);
  const effectiveBillTables = billRequests.length > 0 ? billRequests.map((r) => r.tableNumber).join(', ') : 'T-08';

  const handleTabChange = (tabId: ControlCenterTab) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tabId);
      router.push(`${pathname}?${params.toString()}`);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="w-full bg-white/95 border-b border-neutral-200/80 sticky top-0 z-40 font-sans antialiased backdrop-blur-xl shadow-2xs">
      {/* --- TIER 1: Clean Apple-Style Venue Info & Quick Actions --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-100">
        {/* Left: Mobile Drawer Trigger, Breadcrumb & Clean Typography */}
        <div className="flex items-center gap-3">
          {/* Mobile Slidebar Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
            aria-label="Toggle Navigation Slidebar"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div>
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-wider uppercase text-neutral-400">
              <span>Quad Computing</span>
              <span className="text-neutral-300">/</span>
              <span className="text-neutral-700 font-semibold">Host</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200/60 ml-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>

            <div className="flex items-baseline gap-2.5 mt-0.5">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 font-sans">
                {venueName}
              </h1>
              <span className="hidden sm:inline-block font-mono text-[11px] text-neutral-400">
                ID: <span className="font-semibold text-neutral-600">{venueId.slice(0, 8)}...{venueId.slice(-4)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Status Alerts & Quick Navigation */}
        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          {effectiveBillCount > 0 && (
            <button
              type="button"
              onClick={() => handleTabChange('billing')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-950 text-xs font-semibold border border-sky-300 transition-all shadow-[0_0_14px_rgba(14,165,233,0.3)] ring-1 ring-sky-200/60 cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5 text-sky-600 animate-bounce drop-shadow-[0_0_6px_rgba(14,165,233,0.6)]" />
              <span>
                Bill Requested: {effectiveBillTables}{' '}
                {effectiveBillTotal > 0 && <span className="font-mono text-sky-700 font-bold">(₹{effectiveBillTotal})</span>}
              </span>
            </button>
          )}

          <a
            href={`/menu?cafe_id=${venueId}&table=T-01`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition-all shadow-2xs cursor-pointer"
          >
            <span>Guest Menu (T-01)</span>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </a>
        </div>
      </div>

      {/* --- TIER 2: Desktop Horizontal Navigation --- */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-neutral-50/70 border-t border-neutral-200/60">
        <nav aria-label="Host Workspaces Navigation" className="flex items-center gap-1 overflow-x-auto py-2.5 no-scrollbar">
          {CONTROL_CENTER_TABS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isBilling = item.id === 'billing';
            const badgeCount = isBilling ? effectiveBillCount : 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-xs ring-1 ring-neutral-900/10 font-semibold'
                    : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-sky-400 text-neutral-950 shadow-[0_0_10px_rgba(56,189,248,0.9)]'
                        : 'bg-sky-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.7)]'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* --- MOBILE SLIDEBAR / DRAWER MENU (Android & Mobile Screens) --- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slidebar Sheet */}
          <div className="relative w-72 max-w-[80%] bg-white h-full shadow-2xl flex flex-col z-10 border-r border-neutral-200 animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm tracking-tight text-neutral-900 block">Host Workspaces</span>
                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">Quad Computing</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {CONTROL_CENTER_TABS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isBilling = item.id === 'billing';
                const badgeCount = isBilling ? effectiveBillCount : 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                        : 'text-neutral-700 hover:bg-neutral-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {badgeCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-400 text-neutral-950 shadow-[0_0_8px_rgba(56,189,248,0.9)]">
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-neutral-100 text-[11px] text-neutral-400 text-center font-mono">
              Venue ID: {venueId.slice(0, 8)}...{venueId.slice(-4)}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default ControlCenterHeader;