'use client';

import React, { useState } from 'react';
import { GuestLedgerTab } from './GuestLedgerTab';
import { EventLeadsTab } from './EventLeadsTab';
import { LiveEventsManager } from './LiveEventsManager';

const TABS = [
  { id: 'guests', label: 'All Guests' },
  { id: 'leads', label: 'Event Interested List' },
  { id: 'events', label: 'Live Events' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/** My Guests: who visits, who is interested in the venue's events, and the events themselves. */
export function MyGuestsWorkspace() {
  const [tab, setTab] = useState<TabId>('guests');

  return (
    <div className="space-y-5 text-neutral-900">
      <header>
        <h1 className="font-serif text-3xl tracking-tight text-neutral-950">My Guests</h1>
        <p className="mt-1 text-sm text-neutral-500">Everyone who visits, and everyone who wants to come to your events.</p>
      </header>
      <div role="tablist" aria-label="My Guests" className="flex gap-1 overflow-x-auto rounded-2xl bg-neutral-100 p-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`h-10 shrink-0 cursor-pointer rounded-xl px-4 text-sm font-semibold ${tab === t.id ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'guests' && <GuestLedgerTab />}
      {tab === 'leads' && <EventLeadsTab />}
      {tab === 'events' && <LiveEventsManager />}
    </div>
  );
}
