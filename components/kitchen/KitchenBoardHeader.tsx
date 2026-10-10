'use client';

import React from 'react';
import { Bell, ChefHat, RefreshCw, Volume2, VolumeX } from 'lucide-react';

interface KitchenBoardHeaderProps {
  isSubscribed: boolean;
  isLoading: boolean;
  soundUnlocked: boolean;
  soundMuted: boolean;
  onUnlockSound: () => void;
  onToggleMute: () => void;
  onRefresh: () => void;
}

/** Title, live connection state, the sound switch and refresh. Compact on a phone. */
export function KitchenBoardHeader(props: KitchenBoardHeaderProps) {
  const { isSubscribed, isLoading, soundUnlocked, soundMuted } = props;
  return (
    <header className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-amber-400">
          <ChefHat className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-serif text-lg text-neutral-950 sm:text-xl">Live Kitchen</h2>
          <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            <span className={`h-1.5 w-1.5 rounded-full ${isSubscribed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isSubscribed ? 'Live · new orders appear instantly' : 'Connecting…'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!soundUnlocked ? (
          <button
            type="button"
            onClick={props.onUnlockSound}
            aria-label="Turn on order sound"
            className="flex h-11 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900 cursor-pointer"
          >
            <Bell className="h-4 w-4" /> <span className="hidden sm:inline">Turn on sound</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={props.onToggleMute}
            aria-label={soundMuted ? 'Unmute order sound' : 'Mute order sound'}
            aria-pressed={!soundMuted}
            className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold cursor-pointer ${
              soundMuted ? 'border-neutral-200 bg-neutral-100 text-neutral-600' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{soundMuted ? 'Muted' : 'Sound on'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={props.onRefresh}
          aria-label="Refresh tickets"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
}

export default KitchenBoardHeader;
