'use client';

import { useEffect, useRef } from 'react';

/**
 * Runs `tick` every `ms`, but only while the tab is visible. Becoming visible again runs it at once,
 * so a hidden tab costs no requests and a returning host sees fresh data immediately.
 */
export function usePoll(tick: () => void, ms: number) {
  const ref = useRef(tick);
  ref.current = tick;

  useEffect(() => {
    const run = () => { if (!document.hidden) ref.current(); };
    const id = window.setInterval(run, ms);
    const onVisible = () => { if (!document.hidden) ref.current(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ms]);
}
