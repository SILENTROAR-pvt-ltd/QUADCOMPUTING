'use client';

import React from 'react';
import { QuickActionsDial, type DialAction } from './QuickActionsDial';
import { FloatingCartBar } from './FloatingCartBar';
import { GuestTabBar } from '@/components/guest/shell/GuestTabBar';
import { VibeyLauncher } from '@/components/guest/vibey/VibeyLauncher';
import type { GuestMenuState } from './hooks/useGuestMenuState';

interface MenuDockProps {
  state: GuestMenuState;
  venueId: string;
  dialActions: DialAction[];
  showDial: boolean;
  goTab: (tab: 'menu' | 'live_order' | 'me') => void;
  selectTab: (tab: 'menu' | 'bill' | 'me') => void;
  /**
   * Room mode: the same four tabs (the Bill tab opens the room's own page, which carries the stay's bill), but no table
   * quick actions and no chat ordering, which both address a table.
   */
  roomCode?: string;
}

/** The floating stack pinned to the bottom: the quick-actions button (above the Me tab), the tray bar, and the tab bar. */
export function MenuDock({ state, venueId, dialActions, showDial, goTab, selectTab, roomCode }: MenuDockProps) {
  return (
    <aside aria-label="Guest Floating Controls Dock" className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex flex-col items-center gap-2 px-3 sm:bottom-4 sm:gap-2.5">
      <div className="relative flex w-full max-w-md flex-col items-center gap-2 sm:gap-2.5">
        {showDial && !roomCode && <QuickActionsDial actions={dialActions} />}
        {venueId && !roomCode && <VibeyLauncher state={state} venueId={venueId} />}
        <FloatingCartBar
          totalCartCount={state.totalCartCount} cartSubtotal={state.cartSubtotal} tableNumber={state.tableNumber}
          sentItemsCount={state.sentItems.length} runningTotal={state.runningTotal} activeTab={state.activeTab}
          onOpenCartReview={() => state.setShowCartReview(true)}
          onToggleTab={() => goTab(state.activeTab === 'menu' ? 'live_order' : 'menu')}
        />
        <GuestTabBar
          active={state.activeTab === 'live_order' ? 'bill' : state.activeTab} tableNumber={state.tableNumber}
          cafeId={venueId} billTotal={state.sentItems.length > 0 ? state.runningTotal : 0} onSelect={selectTab} roomCode={roomCode}
        />
      </div>
    </aside>
  );
}
