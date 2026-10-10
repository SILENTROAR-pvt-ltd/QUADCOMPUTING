'use client';

import React from 'react';
import { Sparkles, Wrench, CheckCircle2 } from 'lucide-react';

interface Props {
  status: 'CLEANING' | 'MAINTENANCE';
  isUpdating: boolean;
  onSetStatus: (status: 'VACANT') => void;
}

const COPY = {
  CLEANING: {
    icon: Sparkles, tone: 'border-amber-200 bg-amber-50 text-amber-900', iconTone: 'bg-amber-100 text-amber-700',
    title: 'Housekeeping in progress', body: 'The room is being cleaned and reset after the last guest.', action: 'Mark clean and ready',
  },
  MAINTENANCE: {
    icon: Wrench, tone: 'border-neutral-200 bg-neutral-50 text-neutral-900', iconTone: 'bg-neutral-200 text-neutral-700',
    title: 'On hold for maintenance', body: 'Guests cannot be checked in until the room is released.', action: 'Release room as vacant',
  },
} as const;

/** A room between guests: what is happening to it and the one action that makes it bookable again. */
export function CleaningMaintenanceView({ status, isUpdating, onSetStatus }: Props) {
  const c = COPY[status];
  const Icon = c.icon;
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-6 text-center ${c.tone}`}>
        <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl ${c.iconTone}`}><Icon className="h-5 w-5" /></div>
        <h3 className="mt-3 font-serif text-xl">{c.title}</h3>
        <p className="mx-auto mt-1 max-w-xs text-xs opacity-80">{c.body}</p>
      </div>
      <button type="button" onClick={() => onSetStatus('VACANT')} disabled={isUpdating}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 cursor-pointer">
        <CheckCircle2 className="h-4 w-4" />{isUpdating ? 'Updating…' : c.action}
      </button>
    </div>
  );
}
