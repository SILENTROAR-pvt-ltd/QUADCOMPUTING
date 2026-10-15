'use client';

import React from 'react';
import { QrCode, Lock, UtensilsCrossed, Plus, Clock } from 'lucide-react';
import { BillRequestsToolbarButton } from '../BillRequestsToolbarButton';

interface BillingHeaderProps {
  activeStaff: { id: string; name: string; role: string } | null;
  onLockStaff: () => void;
  isOnline: boolean;
  activeTab: 'pos' | 'history';
  onTabChange: (tab: 'pos' | 'history') => void;
  onOpenQRModal: () => void;
  onOpenBillRequests: () => void;
  onOpenTableModal: () => void;
  unreadBillRequestCount: number;
}

const TOOL_BUTTON =
  'inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-neutral-200/90 bg-white px-3.5 text-xs font-semibold text-neutral-700 shadow-2xs transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.98] cursor-pointer whitespace-nowrap';

export const BillingHeader: React.FC<BillingHeaderProps> = ({
  activeStaff,
  onLockStaff,
  isOnline,
  activeTab,
  onTabChange,
  onOpenQRModal,
  onOpenBillRequests,
  onOpenTableModal,
  unreadBillRequestCount,
}) => {
  const tabClass = (on: boolean) =>
    `inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3.5 text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap md:h-10 md:text-xs ${
      on
        ? 'bg-neutral-900 text-white shadow-xs active:scale-[0.99]'
        : 'border border-neutral-200/90 bg-white text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900'
    }`;

  return (
    <div className="mb-4 flex min-w-0 flex-col gap-3 border-b border-neutral-200/80 pb-4 sm:mb-6 md:flex-row md:items-center md:justify-between md:gap-4">
      {/* Title & Subtitle + Badges */}
      <div className="min-w-0">
        <h2 className="font-serif text-[26px] font-medium leading-tight tracking-tight text-neutral-900 sm:text-3xl">
          Billing &amp; POS
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
          <p className="text-xs font-light text-neutral-500 sm:text-sm">
            Bills &amp; table settlement
          </p>
          {activeStaff && (
            <div className="flex items-center gap-1.5 rounded-full border border-neutral-200/80 bg-neutral-50 py-0.5 pl-2.5 pr-1 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold tracking-wider text-neutral-700">
                {activeStaff.name} ({activeStaff.role})
              </span>
              <button
                type="button"
                onClick={onLockStaff}
                className="grid h-7 w-7 place-items-center rounded-full text-neutral-400 transition-colors hover:text-neutral-900 cursor-pointer"
                title="Lock POS"
                aria-label="Lock POS"
              >
                <Lock className="h-3 w-3" />
              </button>
            </div>
          )}
          {!isOnline && (
            <div className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-orange-700 shadow-2xs">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Offline Cash Mode</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs lead on a phone (two big buttons), the tools scroll sideways under them; one row on a desk. */}
      <div className="flex min-w-0 flex-col gap-2.5 md:flex-row md:items-center">
        <div className="order-2 -mx-1 flex min-w-0 items-center gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] md:order-none md:mx-0 md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          <button type="button" onClick={onOpenQRModal} className={TOOL_BUTTON} title="Generate scannable QR placards for tables">
            <QrCode className="h-3.5 w-3.5 text-neutral-500" />
            <span>QR Placards</span>
          </button>

          <BillRequestsToolbarButton unreadCount={unreadBillRequestCount} onClick={onOpenBillRequests} />

          <button type="button" onClick={onOpenTableModal} className={TOOL_BUTTON} title="Configure and manage venue tables">
            <UtensilsCrossed className="h-3.5 w-3.5 text-neutral-500" />
            <span>Manage Tables</span>
          </button>
        </div>

        <div className="hidden h-5 w-px bg-neutral-200/80 md:block" />

        <div className="order-1 grid grid-cols-2 gap-2 md:order-none md:flex">
          <button type="button" onClick={() => onTabChange('pos')} aria-pressed={activeTab === 'pos'} className={tabClass(activeTab === 'pos')}>
            <Plus className="h-4 w-4 md:h-3.5 md:w-3.5" />
            <span>New order</span>
          </button>
          <button type="button" onClick={() => onTabChange('history')} aria-pressed={activeTab === 'history'} className={tabClass(activeTab === 'history')}>
            <Clock className="h-4 w-4 md:h-3.5 md:w-3.5" />
            <span>Order history</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingHeader;
