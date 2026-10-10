'use client';

import React from 'react';
import { CheckCircle2, Plus, X } from 'lucide-react';
import type { LiveState } from './hooks/useAccommodationsData';

type Tab = 'front-desk' | 'configurator' | 'history';

interface AccommodationsWorkspaceHeaderProps {
  activeMainTab: Tab;
  setActiveMainTab: (tab: Tab) => void;
  successToast?: string;
  onDismissToast?: () => void;
  live?: LiveState;
}

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'front-desk', label: 'Front desk' },
  { id: 'configurator', label: 'Room setup' },
  { id: 'history', label: 'Stay history' },
];

const LIVE = {
  live: { text: 'Live', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500 animate-pulse' },
  connecting: { text: 'Connecting', cls: 'border-neutral-200 bg-neutral-50 text-neutral-600', dot: 'bg-neutral-400' },
  offline: { text: 'Offline · refresh to update', cls: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
} as const;

/** Title, connection state, section tabs and the confirmation of the last change. */
export function AccommodationsWorkspaceHeader({ activeMainTab, setActiveMainTab, successToast, onDismissToast, live = 'connecting' }: AccommodationsWorkspaceHeaderProps) {
  const l = LIVE[live];
  return (
    <div className="mb-6 space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl tracking-tight text-neutral-950">Accommodations</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${l.cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${l.dot}`} />{l.text}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">Check guests in and out, keep rooms turned around, and set up room types.</p>
        </div>
        {activeMainTab === 'front-desk' && (
          <button type="button" onClick={() => setActiveMainTab('configurator')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 cursor-pointer">
            <Plus className="h-4 w-4" /> New room category
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Accommodations sections" className="grid w-full grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1 sm:inline-grid sm:w-auto">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={activeMainTab === t.id} onClick={() => setActiveMainTab(t.id)}
            className={`h-10 rounded-lg px-4 text-sm font-semibold transition-colors cursor-pointer sm:px-6 ${activeMainTab === t.id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {successToast && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 animate-in slide-in-from-top-2 duration-300">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{successToast}</span>
          {onDismissToast && (
            <button type="button" onClick={onDismissToast} aria-label="Dismiss" className="rounded-md p-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"><X className="h-4 w-4" /></button>
          )}
        </div>
      )}
    </div>
  );
}
