'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, AlertCircle } from 'lucide-react';

export function RealtimeHealthIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/95 border border-amber-500/30 text-amber-200 text-xs shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span className="font-mono text-[11px] font-medium tracking-tight">Live Sync Paused &bull; Reconnecting...</span>
    </div>
  );
}
export default RealtimeHealthIndicator;
