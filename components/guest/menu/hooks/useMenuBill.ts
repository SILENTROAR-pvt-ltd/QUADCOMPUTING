'use client';

import { useState } from 'react';
import { resolveTrackerStage } from '../tracker/tracker-copy';
import type { GuestMenuState } from './useGuestMenuState';

/**
 * Asking for the bill. It opens only once the food is ready or served, and only once: a second tap says the bill is on its
 * way. Every bill button on the page goes through `requestBill`.
 */
export function useMenuBill(state: GuestMenuState) {
  const [open, setOpen] = useState(false);
  const stage = resolveTrackerStage(String(state.kotStatus || ''), String(state.masterOrder?.status || ''));
  const billReady = ['ready', 'served'].includes(stage);

  const requestBill = () => {
    if (state.billRequestedBanner) state.showToast('Your bill is on its way. Our team will bring it to your table.');
    else if (billReady) setOpen(true);
    else state.showToast('You can request the bill once your food is ready.');
  };

  return { billReady, finalizeOpen: open, closeFinalize: () => setOpen(false), requestBill };
}
