'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Utensils, Users, Compass, ArrowLeft } from 'lucide-react';

export interface UnifiedNavigationBarProps {
  tableNumber: string;
  cafeId?: string;
  activeTab: 'menu' | 'live_order' | 'me';
  onToggleMenuAndBill: () => void;
  onExplorePortal: () => void;
  sentItemsCount?: number;
  runningTotal?: number;
  hasActiveOrder?: boolean;
}

export const UnifiedNavigationBar: React.FC<UnifiedNavigationBarProps> = ({
  tableNumber,
  cafeId,
  activeTab,
  onToggleMenuAndBill,
  onExplorePortal,
  sentItemsCount = 0,
  runningTotal = 0,
  hasActiveOrder = false,
}) => {
  const lobbyHref = `/guest/lobby?table=${encodeURIComponent(tableNumber)}${
    cafeId ? `&cafe_id=${encodeURIComponent(cafeId)}` : ''
  }`;

  return (
    <nav 
      aria-label="Guest Quick Navigation"
      className="w-full flex justify-center pointer-events-none"
    >
      {/* Apple-grade Light Frosted Glass Navigation Dock */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="pointer-events-auto backdrop-blur-xl bg-white/90 border border-neutral-200/80 rounded-full px-2 sm:px-3 py-1.5 sm:py-2 shadow-[0_10px_30px_rgba(0,0,0,0.08)] flex items-center gap-1 sm:gap-1.5 max-w-full overflow-x-auto no-scrollbar"
      >
        {/* Subtle Top White Hairline Highlight */}
        <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        {/* 1. Menu & Bill Action Pill */}
        <button
          type="button"
          onClick={onToggleMenuAndBill}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[40px] sm:min-h-[44px] rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
            activeTab === 'live_order'
              ? 'bg-neutral-900 text-white shadow-sm'
              : 'text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100/80'
          }`}
          title={activeTab === 'live_order' ? 'Return to Culinary Menu' : 'View Culinary Menu & Active Bill'}
        >
          {activeTab === 'live_order' ? (
            <>
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span>Back to Menu</span>
            </>
          ) : (
            <>
              <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-600" />
              <span>Menu & Bill</span>
              {sentItemsCount > 0 && (
                <span className="font-mono text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 ml-0.5 font-semibold">
                  ₹{runningTotal}
                </span>
              )}
            </>
          )}
        </button>

        {/* Vertical Hairline Separator */}
        <div className="w-[1px] h-4 bg-neutral-200 shrink-0" />

        {/* 2. Social Lobby Action Pill */}
        <Link
          href={lobbyHref}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[40px] sm:min-h-[44px] rounded-full text-xs sm:text-sm font-medium text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100/80 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          title="Enter Social Lounge & Connect"
        >
          {/* Live pulsing green beacon */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-600" />
          <span>Social Lobby</span>
        </Link>

        {/* Vertical Hairline Separator */}
        <div className="w-[1px] h-4 bg-neutral-200 shrink-0" />

        {/* 3. Explore Portal (Services) Action Pill */}
        <button
          type="button"
          onClick={onExplorePortal}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[40px] sm:min-h-[44px] rounded-full text-xs sm:text-sm font-medium text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100/80 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          title="Explore Venue Services, Stay & Concierge"
        >
          <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-600" />
          <span>Explore Portal</span>
        </button>
      </motion.div>
    </nav>
  );
};
