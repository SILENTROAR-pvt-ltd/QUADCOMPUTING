// components/guest/lobby/LobbyFeedEmpty.tsx
'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';

export function LobbyFeedEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
      <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mb-3">
        <MessageCircle className="w-6 h-6 text-neutral-300" />
      </div>
      <p className="font-serif text-base text-neutral-900">It&apos;s quiet in here</p>
      <p className="text-xs text-neutral-500 mt-1 max-w-xs">
        Start the conversation: say hello, recommend a dish or share a photo with everyone at the venue.
      </p>
    </div>
  );
}

export default LobbyFeedEmpty;
