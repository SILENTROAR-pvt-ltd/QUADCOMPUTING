'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useGuestLedger, type LedgerFilter } from './useGuestLedger';

const FILTERS: Array<{ id: LedgerFilter; label: string }> = [
  { id: 'all', label: 'All guests' },
  { id: 'repeat', label: 'Repeat guests' },
  { id: 'spenders', label: 'High spenders' },
  { id: 'recent', label: 'Recent visits' },
];
const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : 'Not yet');

/** Tab 1: everyone the venue knows, with how often they come and what they spend. */
export function GuestLedgerTab() {
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [search, setSearch] = useState('');
  const { data, loading, error } = useGuestLedger(filter, search);
  const m = data?.metrics;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Unique guests', m?.totalGuests], ['Repeat visitors', m?.repeatVisitors], ['Stayed in a room', m?.stayGuests, m?.nights ? `${m.nights} nights in all` : undefined], ['Event leads', m?.totalEventLeads]].map(([label, value, hint]) => (
          <div key={String(label)} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="text-2xl font-semibold tabular-nums text-neutral-950">{value ?? '–'}</p>
            <p className="mt-0.5 text-[11px] font-medium text-neutral-500">{label}{hint ? <span className="text-neutral-400"> · {hint}</span> : null}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, Vibers ID, phone or email" aria-label="Search guests"
            className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-[16px] focus:border-neutral-900 focus:outline-none" />
        </div>
        <div role="group" aria-label="Filter guests" className="flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
              className={`h-10 shrink-0 cursor-pointer rounded-full px-3.5 text-xs font-semibold ${filter === f.id ? 'bg-neutral-950 text-white' : 'border border-neutral-200 bg-white text-neutral-700'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {loading ? <div className="shimmer m-4 h-24 rounded-xl" /> : !data || data.guests.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-neutral-500">{filter === 'all' && !search ? 'Guests appear here after their first settled bill or event sign-up.' : 'No guests match.'}</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {data.guests.map((g) => (
              <li key={g.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[1.4fr_1.2fr_.6fr_1fr_.8fr] sm:items-center sm:gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-950">{g.guest_name}</p>
                  {g.vibers_handle
                    ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">{g.vibers_handle}</span>
                    : <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">Walk-in</span>}
                </div>
                <p className="truncate text-xs text-neutral-600">{[g.phone, g.email].filter(Boolean).join(' · ') || 'No contact yet'}</p>
                <p className="text-xs text-neutral-600">
                  <span className="font-semibold tabular-nums text-neutral-900">{g.visits}</span> {g.visits === 1 ? 'visit' : 'visits'}
                  {/* Stays are visits too; this says how many of them were a room, and for how long. */}
                  {Number(g.stays) > 0 && <span className="ml-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">{g.stays} stay{g.stays === 1 ? '' : 's'} · {g.nights} night{g.nights === 1 ? '' : 's'}</span>}
                </p>
                <p className="text-xs text-neutral-600">{when(g.last_visit_at)}</p>
                <p className="text-sm font-semibold tabular-nums text-neutral-950">{money(Number(g.total_spend))}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      {data && filter === 'spenders' && <p className="text-[11px] text-neutral-500">High spenders: {money(data.highSpenderThreshold)} or more in total.</p>}
    </div>
  );
}
