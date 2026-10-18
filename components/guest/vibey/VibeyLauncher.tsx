'use client';

import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { press } from '@/components/guest/menu/motion';
import type { MenuItem } from '@/components/guest/menu/types';
import type { GuestMenuState } from '@/components/guest/menu/hooks/useGuestMenuState';
import { useVibeyGuest } from './useVibeyGuest';
import { VibeySheet } from './VibeySheet';
import { VibeyAvatar } from './VibeyAvatar';

interface VibeyLauncherProps {
  state: GuestMenuState;
  venueId: string;
}

/**
 * "Ask Vibey": a small pill on the left above the tray bar (the quick-actions button sits on the right), shown only
 * when the venue has Vibey switched on, and the chat sheet it opens. The sheet renders outside the dock, whose wrapper
 * ignores taps.
 */
export function VibeyLauncher({ state, venueId }: VibeyLauncherProps) {
  const [open, setOpen] = useState(false);
  const menu = state.diningItems as MenuItem[];
  const openTray = useCallback(() => { setOpen(false); state.setShowCartReview(true); }, [state]);
  const needOptions = useCallback((item: MenuItem) => { setOpen(false); state.handleOpenCustomization(item); }, [state]);
  const chat = useVibeyGuest({
    venueId, tableNumber: state.tableNumber, menu, onNeedOptions: needOptions, onOpenTray: openTray, showToast: state.showToast,
  });

  if (!chat.status.enabled || state.activeTab !== 'menu') return null;
  return (
    <>
      <motion.button type="button" {...press} onClick={() => setOpen(true)} aria-haspopup="dialog"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto absolute bottom-full left-0 mb-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-white/95 pl-1.5 pr-4 text-[13px] font-semibold text-zinc-900 shadow-[0_14px_30px_-14px_rgba(244,63,94,0.45)] ring-1 ring-black/10 hover:bg-white">
        <VibeyAvatar size={32} mood="idle" />
        <span>Ask Vibey <span className="font-normal text-zinc-500">· order by chat</span></span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <div className="pointer-events-auto">
            <VibeySheet chat={chat} venueName={state.businessName || 'Venue'} tableNumber={state.tableNumber} menu={menu}
              quantityOf={state.getItemCartQuantity} onIncrement={state.handleItemIncrement} onDecrement={state.handleItemDecrement}
              onOpenTray={openTray} onClose={() => setOpen(false)} />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
