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

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

/** Sticky lounge header: the venue and table, who is here, and the section tabs. */
export function LoungeTopBar({ venueName, table, onlineCount, view, onSelect }: LoungeTopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-[#faf9f6]">
      <div className="mx-auto max-w-3xl px-4 pb-3 pt-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400">{GUEST_BRAND.name}</p>
            <h1 className="mt-0.5 text-[30px] leading-none text-neutral-950" style={SERIF}>The Lounge</h1>
            <p className="mt-1.5 flex items-center gap-1.5 truncate text-[12px] text-neutral-500">
              <MapPin className="h-3 w-3 shrink-0 text-neutral-400" aria-hidden />
              <span className="truncate">{venueName ? `${venueName} · ` : ''}Table {table}</span>
            </p>
          </div>
          <div className="mt-1 inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 text-[12px] font-medium text-neutral-700 shadow-[0_6px_14px_-10px_rgba(0,0,0,0.4)]">
            <span aria-hidden className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {onlineCount} here now
          </div>
        </div>

        <div role="tablist" aria-label="Lounge sections" className="mt-3.5 grid grid-cols-4 gap-1 rounded-full border border-neutral-200/80 bg-white p-1 shadow-[0_8px_20px_-16px_rgba(0,0,0,0.35)]">
          {LOUNGE_VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => onSelect(id)}
              className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-semibold transition-all cursor-pointer ${
                view === id ? 'bg-zinc-950 text-white shadow-[0_8px_16px_-10px_rgba(0,0,0,0.7)]' : 'text-neutral-500 hover:text-neutral-900'
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