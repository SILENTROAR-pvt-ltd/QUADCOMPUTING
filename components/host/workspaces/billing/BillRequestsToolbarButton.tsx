'use client';

import React, { useState, useEffect } from 'react';
import { ReceiptText } from 'lucide-react';

interface BillRequestsToolbarButtonProps {
  unreadCount: number;
  onClick: () => void;
}

export function BillRequestsToolbarButton({ unreadCount, onClick }: BillRequestsToolbarButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayCount = mounted ? unreadCount : 0;
  const hasUnread = displayCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open bill requests${hasUnread ? `, ${displayCount} unread` : ''}`}
      className={`inline-flex shrink-0 h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer whitespace-nowrap ${
        hasUnread
          ? 'border-sky-300 bg-sky-50/80 text-sky-950 shadow-[0_0_14px_rgba(14,165,233,0.25)] hover:bg-sky-100/80 hover:border-sky-400'
          : 'border-neutral-200/90 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300'
      }`}
    >
      <ReceiptText
        className={`h-3.5 w-3.5 ${hasUnread ? 'text-sky-600' : 'text-neutral-500'}`}
        aria-hidden="true"
      />
      <span>Bill Requests</span>
      <span
        suppressHydrationWarning
        aria-live="polite"
        aria-atomic="true"
        className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-mono font-bold transition-all ${
          hasUnread
            ? 'bg-sky-500 text-white shadow-[0_0_8px_rgba(14,165,233,0.5)]'
            : 'bg-neutral-100 text-neutral-500'
        }`}
      >
        {displayCount}
      </span>
    </button>
  );
}

export default BillRequestsToolbarButton;