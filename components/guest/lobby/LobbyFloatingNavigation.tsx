// components/guest/lobby/LobbyFloatingNavigation.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Utensils, Users, Compass, Wallet } from 'lucide-react';

interface LobbyFloatingNavigationProps {
  currentUserTable: string;
  cafeId?: string;
  onOpenPortal?: () => void;
  onlineCount?: number;
  walletBalance?: number;
  onOpenWallet?: () => void;
}

export function LobbyFloatingNavigation({
  currentUserTable,
  cafeId,
  onlineCount = 0,
  walletBalance = 0,
  onOpenWallet,
}: LobbyFloatingNavigationProps) {
  const menuHref = `/menu?table=${encodeURIComponent(currentUserTable)}${
    cafeId ? `&cafe_id=${encodeURIComponent(cafeId)}` : ''
  }`;

  return (
    <aside
      aria-label="Guest Quick Navigation Dock"
      className="fixed bottom-3 sm:bottom-4 inset-x-0 z-50 flex justify-center px-3 sm:px-4 pointer-events-none pb-[env(safe-area-inset-bottom,0px)]"
    >
      {/* Apple-grade Light Frosted Glass Navigation Dock with Live Wallet Integration */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="pointer-events-auto backdrop-blur-xl bg-white/95 border border-neutral-200/80 rounded-full px-2 sm:px-3 py-1.5 sm:py-2 shadow-[0_10px_35px_rgba(0,0,0,0.12)] flex items-center gap-1 sm:gap-1.5 max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar"
      >
        {/* Subtle Top White Hairline Highlight */}
        <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        {/* 1. Menu & Bill Pill */}
        <Link
          href={menuHref}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[40px] sm:min-h-[44px] rounded-full text-xs sm:text-sm font-medium tracking-wide text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100/80 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          title="Return to Culinary Menu & Active Bill"
        >
          <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-600" />
          <span>Menu & Bill</span>
        </Link>

        {/* Vertical Hairline Separator */}
        <div className="w-[1px] h-4 bg-neutral-200 shrink-0" />

        {/* 2. Social Lobby (Active Tab Pill) */}
        <div
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[40px] sm:min-h-[44px] rounded-full text-xs sm:text-sm font-medium tracking-wide bg-neutral-900 text-white shadow-sm whitespace-nowrap cursor-default"
        >
          {/* Live pulsing green beacon */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span>Social Lobby</span>
          {onlineCount > 0 && (
            <span className="font-mono text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-white ml-0.5 font-semibold">
              {onlineCount}
            </span>
          )}
        </div>

        {/* Vertical Hairline Separator */}
        <div className="w-[1px] h-4 bg-neutral-200 shrink-0" />

        {/* 3. Live 7% Cashback Wallet Badge Pill */}
        <button
          type="button"
          onClick={onOpenWallet}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[40px] sm:min-h-[44px] rounded-full text-xs sm:text-sm font-semibold tracking-wide bg-gradient-to-r from-emerald-500/10 via-emerald-500/15 to-emerald-500/20 text-emerald-900 border border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/25 transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-xs group"
          title="View Digital Wallet Balance & 7% Cashback Rewards"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 transition-transform group-hover:scale-110" />
          <span>₹{walletBalance.toFixed(0)} Wallet</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold ml-0.5">
            7%
          </span>
        </button>

        {/* Vertical Hairline Separator */}
        <div className="w-[1px] h-4 bg-neutral-200 shrink-0" />

        {/* 4. Explore Portal Action Pill */}
        <Link
          href={`/menu?table=${encodeURIComponent(currentUserTable)}&section=portal#services-section${
            cafeId ? `&cafe_id=${encodeURIComponent(cafeId)}` : ''
          }`}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[40px] sm:min-h-[44px] rounded-full text-xs sm:text-sm font-medium tracking-wide text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100/80 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          title="Explore Venue Services, Stay & Concierge"
        >
          <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-600" />
          <span>Explore Portal</span>
        </Link>
      </motion.div>
    </aside>
  );
}

export default LobbyFloatingNavigation;
