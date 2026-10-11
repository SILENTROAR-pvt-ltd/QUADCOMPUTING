'use client';

import { useEffect } from 'react';

const BEAT_MS = 20_000;

/**
 * Presence while the club tab is visible: a heartbeat every 20 s, and an immediate leave when the tab
 * is hidden, closed or navigated away from. The server forgets anyone silent for 45 s.
 */
export function usePresence(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const beat = () => { void fetch('/api/club/presence/heartbeat', { method: 'POST', cache: 'no-store' }).catch(() => {}); };
    const leave = () => {
      if (timer) { clearInterval(timer); timer = null; }
      try {
        if (!navigator.sendBeacon?.('/api/club/presence/leave')) void fetch('/api/club/presence/leave', { method: 'POST', keepalive: true });
      } catch {}
    };
    const start = () => {
      if (timer) return;
      beat();
      timer = setInterval(beat, BEAT_MS);
    };
    const onVisibility = () => (document.visibilityState === 'visible' ? start() : leave());

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', leave);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', leave);
      if (timer) clearInterval(timer);
    };
  }, [enabled]);
}
