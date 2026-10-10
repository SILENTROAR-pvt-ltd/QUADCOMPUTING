// components/guest/lobby/LoungeHeader.tsx
'use client';

import React from 'react';

interface LoungeHeaderProps {
  activeTablesCount: number;
  participants?: string[];
}

export function LoungeHeader({ activeTablesCount }: LoungeHeaderProps) {
  return (
    <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-neutral-100 bg-white shrink-0">
      <div>
        <h3 className="font-serif text-lg font-normal text-neutral-950 tracking-tight">Venue chat</h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Everyone here can read this
          {activeTablesCount > 0 ? ` · ${activeTablesCount} ${activeTablesCount === 1 ? 'table' : 'tables'} talking` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-semibold tracking-widest uppercase">Live</span>
      </div>
    </div>
  );
}

export default LoungeHeader;
