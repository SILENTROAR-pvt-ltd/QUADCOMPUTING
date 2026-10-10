'use client';

import React from 'react';

export function PhotoVaultModalFooter({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-6 py-3.5 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
      <p className="text-[11px] text-neutral-400 font-mono">
        Quad Computing · Realtime Venue Sync v2.4
      </p>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-1.5 rounded-xl text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 transition-colors cursor-pointer"
      >
        Done
      </button>
    </div>
  );
}
