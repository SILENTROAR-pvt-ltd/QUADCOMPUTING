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
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-200/80 pb-4">
      {/* Title & Subtitle + Badges */}
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-neutral-900">
          Billing &amp; POS Ecosystem
        </h2>
        <div className="mt-1 sm:mt-1.5 flex flex-wrap items-center gap-2.5 sm:gap-3">
          <p className="text-xs sm:text-sm text-neutral-500 font-light">
            Digital receipt generator &amp; table settlement
          </p>
          {activeStaff && (
            <div className="flex items-center gap-1.5 rounded-full border border-neutral-200/80 bg-neutral-50 px-2.5 py-0.5 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold tracking-wider text-neutral-700">
                {activeStaff.name} ({activeStaff.role})
              </span>
              <button
                type="button"
                onClick={onLockStaff}
                className="ml-1 text-neutral-400 hover:text-neutral-900 cursor-pointer transition-colors"
                title="Lock POS"
              >
                <Lock className="w-3 h-3" />
              </button>
            </div>
          )}
          {!isOnline && (
            <div className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-orange-700 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Offline Cash Mode</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={onOpenQRModal}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 transition-all cursor-pointer whitespace-nowrap"
          title="Generate scannable QR placards for tables"
        >
          <QrCode className="h-3.5 w-3.5 text-neutral-500" />
          <span>QR Placards</span>
        </button>

        <BillRequestsToolbarButton
          unreadCount={unreadBillRequestCount}
          onClick={onOpenBillRequests}
        />

        <button
          type="button"
          onClick={onOpenTableModal}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 transition-all cursor-pointer whitespace-nowrap"
          title="Configure and manage venue tables"
        >
          <UtensilsCrossed className="h-3.5 w-3.5 text-neutral-500" />
          <span>Manage Tables</span>
        </button>

        <div className="hidden sm:block h-5 w-px bg-neutral-200/80 mx-0.5" />

        <button
          type="button"
          onClick={() => onTabChange('pos')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'pos'
              ? 'bg-neutral-900 text-white shadow-xs hover:bg-neutral-800 active:scale-[0.99]'
              : 'border border-neutral-200/90 bg-white text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300'
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New POS Order</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('history')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-neutral-900 text-white shadow-xs hover:bg-neutral-800 active:scale-[0.99]'
              : 'border border-neutral-200/90 bg-white text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Order History</span>
        </button>
      </div>
    </div>
  );
};

export default BillingHeader;
