'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, UserRound, X } from 'lucide-react';
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

const ROUND = 'grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors cursor-pointer';

/**
 * Filtering the lobby, made for a phone: one row that never scrolls sideways. The kinds are three equal buttons, "Mine" and
 * search are round buttons beside them, and the search box opens only when asked for. Typing waits for a pause before it
 * searches, so the feed does not refresh on every letter.
 */
export function LobbyFilters({ kind, onKind, mine, onMine, onSearch, canSeeMine }: LobbyFiltersProps) {
  const [text, setText] = useState('');
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const first = useRef(true);

  useEffect(() => {
    // Nothing to do on the first render: the feed has already loaded unfiltered.
    if (first.current) { first.current = false; return; }
    const timer = setTimeout(() => onSearch(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text, onSearch]);

  useEffect(() => { if (searching) inputRef.current?.focus(); }, [searching]);

  const closeSearch = () => { setSearching(false); setText(''); };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Lobby filter" className="grid min-w-0 flex-1 grid-cols-3 rounded-full border border-neutral-200/80 bg-white p-1">
          {FEED_FILTERS.map((f) => {
            const active = kind === f.id && !mine;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => { onKind(f.id); onMine(false); }}
                className={`h-8 truncate rounded-full px-1 text-[12.5px] font-semibold transition-colors cursor-pointer ${active ? 'bg-zinc-950 text-white' : 'text-neutral-500 active:bg-neutral-100'}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {canSeeMine && (
          <button
            type="button"
            aria-pressed={mine}
            aria-label="Show only my posts"
            onClick={() => onMine(!mine)}
            className={`${ROUND} ${mine ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-neutral-200/80 bg-white text-neutral-600'}`}
          >
            <UserRound className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          aria-pressed={searching}
          aria-label={searching ? 'Close search' : 'Search the lobby'}
          onClick={() => (searching ? closeSearch() : setSearching(true))}
          className={`${ROUND} ${searching ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-neutral-200/80 bg-white text-neutral-600'}`}
        >
          {searching ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </button>
      </div>

      {searching && (
        <label className="relative block">
          <span className="sr-only">Search the lobby</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            ref={inputRef}
            type="search"
            value={text}
            maxLength={60}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search postcards and messages"
            className="h-10 w-full rounded-full border border-neutral-200 bg-white pl-9 pr-3.5 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
          />
        </label>
      )}
    </div>
  );
}

export default LobbyFilters;
