'use client';

import React, { useEffect, useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import type { LobbyFilter } from '@/lib/guest/lobby-posts-client';
import { FEED_FILTERS } from './lobby-kind-meta';

interface LobbyFiltersProps {
  kind: LobbyFilter;
  onKind: (kind: LobbyFilter) => void;
  mine: boolean;
  onMine: (mine: boolean) => void;
  onSearch: (text: string) => void;
  canSeeMine: boolean;
}

/** Filter the lobby the way a feed is filtered: by kind, by your own posts, or by words. */
export function LobbyFilters({ kind, onKind, mine, onMine, onSearch, canSeeMine }: LobbyFiltersProps) {
  const [text, setText] = useState('');

  // Wait for a short pause in typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => onSearch(text), 350);
    return () => clearTimeout(timer);
  }, [text, onSearch]);

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Lobby filter" className="flex gap-1.5 overflow-x-auto pb-1">
        {FEED_FILTERS.map((f) => {
          const active = kind === f.id && !mine;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { onKind(f.id); onMine(false); }}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                active ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
              }`}
            >
              {f.label}
            </button>
          );
        })}
        {canSeeMine && (
          <button
            type="button"
            aria-pressed={mine}
            onClick={() => onMine(!mine)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              mine ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
            }`}
          >
            <UserRound className="h-3.5 w-3.5" /> Mine
          </button>
        )}
      </div>

      <label className="relative block">
        <span className="sr-only">Search the lobby</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          value={text}
          maxLength={60}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search the lobby"
          className="w-full rounded-2xl border border-neutral-200 bg-white py-2.5 pl-9 pr-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
        />
      </label>
    </div>
  );
}

export default LobbyFilters;
