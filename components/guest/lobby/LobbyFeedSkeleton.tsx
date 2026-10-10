// components/guest/lobby/LobbyFeedSkeleton.tsx
'use client';

import React from 'react';

export function LobbyFeedSkeleton() {
  return (
    <div className="w-full rounded-3xl bg-white border border-neutral-200 overflow-hidden h-[calc(100dvh-17rem)] min-h-[420px] max-h-[760px] flex flex-col" aria-busy="true" aria-label="Loading chat">
      <div className="h-14 w-full border-b border-neutral-100 bg-neutral-50 animate-pulse" />
      <div className="flex-1 p-5 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-neutral-100 rounded-full animate-pulse" />
              <div className="h-14 bg-neutral-50 border border-neutral-100 rounded-2xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LobbyFeedSkeleton;
