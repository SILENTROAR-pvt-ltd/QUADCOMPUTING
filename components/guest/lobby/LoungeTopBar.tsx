'use client';

import React from 'react';
import { MapPin, MessageCircle, CalendarDays, Tag, Star } from 'lucide-react';
import { GUEST_BRAND } from '@/lib/brand';

export type LoungeView = 'chat' | 'moments' | 'offers' | 'reviews';

export const LOUNGE_VIEWS: Array<{ id: LoungeView; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'chat', label: 'Lobby', icon: MessageCircle },
  { id: 'moments', label: 'Events', icon: CalendarDays },
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

const SERIF = { fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" } as const;

/** Sticky lounge header: the venue and table, who is here, and the section tabs. */
export function LoungeTopBar({ venueName, table, onlineCount, view, onSelect }: LoungeTopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e8dfcc] bg-[#f5f1e8]/95">
      <div className="mx-auto max-w-3xl px-4 pb-3 pt-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.3em] text-[#8a6d3f] before:h-px before:w-5 before:bg-[#b08d57]">{GUEST_BRAND.name}</p>
            <h1 className="mt-1 text-[34px] font-light leading-none text-[#10231a]" style={SERIF}>The <em className="font-normal text-[#8a6d3f]">Lounge</em></h1>
            <p className="mt-1.5 flex items-center gap-1.5 truncate text-[12px] text-[#10231a]/55">
              <MapPin className="h-3 w-3 shrink-0 text-[#b08d57]" aria-hidden />
              <span className="truncate">{venueName ? `${venueName} · ` : ''}Table {table}</span>
            </p>
          </div>
          <div className="mt-1 inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-[#e8dfcc] bg-[#fbf9f4] px-3 text-[12px] font-medium text-[#10231a]/75 shadow-[0_8px_16px_-12px_rgba(16,35,26,0.45)]">
            <span aria-hidden className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d9c193] opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#b08d57]" />
            </span>
            {onlineCount} here now
          </div>
        </div>

        <div role="tablist" aria-label="Lounge sections" className="mt-3.5 grid grid-cols-4 gap-1 rounded-full border border-[#e8dfcc] bg-[#fbf9f4] p-1 shadow-[0_10px_22px_-18px_rgba(16,35,26,0.45)]">
          {LOUNGE_VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => onSelect(id)}
              className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-semibold transition-all cursor-pointer ${
                view === id ? 'bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#f5f1e8] shadow-[0_8px_16px_-10px_rgba(15,42,30,0.8)]' : 'text-[#10231a]/55 hover:text-[#10231a]'
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