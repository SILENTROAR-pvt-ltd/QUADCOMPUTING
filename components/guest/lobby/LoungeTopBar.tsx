'use client';

import React from 'react';
import { MessageCircle, Images, Tag, Star } from 'lucide-react';
import { GUEST_BRAND } from '@/lib/brand';

export type LoungeView = 'chat' | 'moments' | 'offers' | 'reviews';

export const LOUNGE_VIEWS: Array<{ id: LoungeView; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'chat', label: 'Lobby', icon: MessageCircle },
  { id: 'moments', label: 'Moments', icon: Images },
  { id: 'offers', label: 'Offers', icon: Tag },
  { id: 'reviews', label: 'Reviews', icon: Star },
];

interface LoungeTopBarProps {
  venueName: string;
  table: string;
  onlineCount: number;
  view: LoungeView;
  onSelect: (view: LoungeView) => void;
}

/** Sticky lounge header: venue, table, who is here, and the section tabs. */
export function LoungeTopBar({ venueName, table, onlineCount, view, onSelect }: LoungeTopBarProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#faf9f6]/95 backdrop-blur-xl border-b border-neutral-200/80">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-semibold">{GUEST_BRAND.name}</p>
            <h1 className="font-serif text-2xl text-neutral-950 leading-tight">Lounge</h1>
            <p className="text-xs text-neutral-500 truncate">
              {venueName ? `${venueName} · ` : ''}Table {table}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {onlineCount} here now
          </div>
        </div>

        <div role="tablist" aria-label="Lounge sections" className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-neutral-100/80 p-1">
          {LOUNGE_VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => onSelect(id)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-colors cursor-pointer ${
                view === id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export default LoungeTopBar;
