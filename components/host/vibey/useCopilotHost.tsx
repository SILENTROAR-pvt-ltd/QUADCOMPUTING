'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useCopilot } from './useCopilot';
import { CopilotDrawer } from './CopilotDrawer';

/**
 * The co-pilot, mounted once for the whole workspace so it is there on every tab: Ctrl/Cmd + K opens it, and its
 * drawer. `open` is undefined while the venue does not have Vibey switched on, so the buttons stay hidden.
 */
export function useCopilotHost(venueId: string, tab: string, unlocked: boolean, onNavigate: (tab: string) => void) {
  const copilot = useCopilot(venueId, tab, unlocked);
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!copilot.enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copilot.enabled]);

  const drawer = (
    <AnimatePresence>
      {copilot.enabled && isOpen && <CopilotDrawer copilot={copilot} tab={tab} onNavigate={onNavigate} onClose={close} />}
    </AnimatePresence>
  );
  return { open: copilot.enabled ? open : undefined, drawer };
}
