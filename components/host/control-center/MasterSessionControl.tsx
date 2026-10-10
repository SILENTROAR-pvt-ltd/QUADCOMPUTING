'use client';

import React from 'react';
import { Lock, LockOpen } from 'lucide-react';

interface MasterSessionControlProps {
  unlocked: boolean;
  /** Icon-only control for the mobile header. */
  compact?: boolean;
  onLock: () => void;
  onUnlock: () => void;
}

/** Shows whether the master PIN session is open on this device, and locks or unlocks it. */
export function MasterSessionControl({ unlocked, compact = false, onLock, onUnlock }: MasterSessionControlProps) {
  const Icon = unlocked ? LockOpen : Lock;
  const action = unlocked ? onLock : onUnlock;
  const actionLabel = unlocked ? 'Lock now' : 'Unlock';

  if (compact) {
    return (
      <button
        type="button"
        onClick={action}
        aria-label={unlocked ? 'Lock master session' : 'Unlock master session'}
        title={unlocked ? 'Lock master session' : 'Unlock master session'}
        className={`grid h-9 w-9 place-items-center rounded-xl border transition-colors cursor-pointer ${
          unlocked ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
        }`}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
      unlocked ? 'border-emerald-200 bg-emerald-50/60' : 'border-neutral-200 bg-white'
    }`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          unlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
        }`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-xs font-semibold text-neutral-900">Master session</p>
          <p className={`text-[11px] ${unlocked ? 'text-emerald-700' : 'text-neutral-500'}`}>{unlocked ? 'Unlocked on this device' : 'Locked'}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={action}
        aria-label={`${actionLabel} master session`}
        className="h-8 shrink-0 cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 text-[11px] font-semibold text-neutral-900 hover:bg-neutral-50"
      >
        {actionLabel}
      </button>
    </div>
  );
}
