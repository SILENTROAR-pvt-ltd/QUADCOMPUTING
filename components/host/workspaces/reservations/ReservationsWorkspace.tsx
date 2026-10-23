'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BedDouble, CalendarHeart, Sparkles, Tag, UtensilsCrossed } from 'lucide-react';
import { useReservations, type ReservationFilter } from './useReservations';
import { ReservationRow } from './ReservationRow';
import { useRoomReservations } from './useRoomReservations';
import { RoomReservationRow } from './RoomReservationRow';
import { RoomReservationSheet } from './RoomReservationSheet';
import { ReservationEventsPanel, ReservationOffersPanel } from './ReservationPanels';
import { ServiceRequestsPanel } from './ServiceRequestsPanel';
import type { ReservationSummary } from '@/lib/services/reservations/reservation-summary.service';

const FILTERS: Array<{ id: ReservationFilter; label: string }> = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All' },
];
type Kind = 'tables' | 'rooms' | 'events' | 'offers' | 'services';

/** How many wait in each kind, for the tab badges (the same summary that lights the sidebar). */
function useWaiting() {
  const [s, setS] = useState<ReservationSummary | null>(null);
  useEffect(() => {
    const load = () => fetch('/api/host/reservations/summary', { cache: 'no-store' }).then((r) => r.json()).then((d) => d?.summary && setS(d.summary)).catch(() => {});
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 20_000);
    return () => clearInterval(t);
  }, []);
  return s;
}

/**
 * Everything guests have booked or asked for, in one place: tables for an evening, rooms for a stay, places on an event's
 * guest list, live-offer redemptions and questions, and the venue services they asked for from the menu. Each kind has its
 * own list and actions; rooms open a full-detail sheet whose button goes to the Accommodations desk. A service request
 * waiting when the tab opens (the bell's "Open in Reservations") opens on Services.
 */
export function ReservationsWorkspace({ onNavigate, venueId = '' }: { onNavigate?: (tab: string) => void; venueId?: string } = {}) {
  const [filter, setFilter] = useState<ReservationFilter>('upcoming');
  const [kind, setKind] = useState<Kind>('tables');
  const [openId, setOpenId] = useState<string | null>(null);
  const tables = useReservations(filter);
  const rooms = useRoomReservations(filter);
  const waiting = useWaiting();
  const open = openId ? rooms.items.find((b) => b.id === openId) || null : null;
  const chosen = useRef(false);
  const choose = (k: Kind) => { chosen.current = true; setKind(k); };
  useEffect(() => {
    if (!waiting || chosen.current) return;
    chosen.current = true;
    if (waiting.services?.waiting) setKind('services');
  }, [waiting]);

  const seg = (id: Kind, label: string, Icon: typeof BedDouble, tone: string, count: number | null, fresh: number) => (
    <button key={id} type="button" role="tab" aria-selected={kind === id} onClick={() => choose(id)}
      className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold ${kind === id ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}>
      <Icon className={`h-4 w-4 ${tone}`} aria-hidden /> {label}
      {count !== null && <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-700">{count}</span>}
      {fresh > 0 && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-900">{fresh} new</span>}
    </button>
  );

  return (
    <div className="space-y-5 pb-24 text-neutral-900 animate-in fade-in duration-300">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-neutral-950">Reservations</h1>
          <p className="mt-1 text-sm text-neutral-500">Tables, rooms, event guest lists, offer and service requests, as guests make them. Hours live in My profile; room rates in Accommodations.</p>
        </div>
        {(waiting?.waiting ?? 0) > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">{waiting!.waiting} waiting for you</span>
        )}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Reservation kind" className="-mx-1 flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-neutral-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {seg('tables', 'Tables', UtensilsCrossed, 'text-sky-700', tables.items.length, waiting?.tables.waiting ?? 0)}
          {seg('rooms', 'Rooms', BedDouble, 'text-emerald-700', rooms.items.length, waiting?.rooms.waiting ?? 0)}
          {seg('events', 'Events', CalendarHeart, 'text-rose-600', null, waiting?.events.waiting ?? 0)}
          {seg('offers', 'Offers', Tag, 'text-amber-700', null, waiting?.offers.waiting ?? 0)}
          {seg('services', 'Services', Sparkles, 'text-violet-700', null, waiting?.services?.waiting ?? 0)}
        </div>
        {(kind === 'tables' || kind === 'rooms') && (
          <div role="tablist" aria-label="Reservation view" className="inline-flex gap-1 rounded-2xl bg-neutral-100 p-1">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
                className={`h-10 cursor-pointer rounded-xl px-4 text-sm font-semibold ${filter === f.id ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'}`}>{f.label}</button>
            ))}
          </div>
        )}
      </div>

      {kind === 'tables' && tables.error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{tables.error}</p>}
      {kind === 'rooms' && rooms.error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{rooms.error}</p>}

      {kind === 'events' ? <ReservationEventsPanel /> : kind === 'offers' ? <ReservationOffersPanel venueId={venueId} /> : kind === 'services' ? <ServiceRequestsPanel venueId={venueId} /> : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {kind === 'tables' ? (
            tables.loading ? <div className="shimmer m-4 h-24 rounded-xl" /> : tables.items.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-neutral-500">{filter === 'upcoming' ? 'No upcoming table reservations. New requests appear here straight away.' : 'No table reservations yet.'}</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {tables.items.map((r) => <ReservationRow key={r.id} reservation={r} busy={tables.busyId === r.id} onSet={(s) => void tables.setStatus(r.id, s)} />)}
              </ul>
            )
          ) : rooms.loading ? <div className="shimmer m-4 h-24 rounded-xl" /> : rooms.items.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-neutral-500">{filter === 'upcoming' ? 'No upcoming room reservations. Bookings from the stay page and the desk appear here.' : 'No room reservations yet.'}</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {rooms.items.map((b) => <RoomReservationRow key={b.id} booking={b} busy={rooms.busyId === b.id} onAct={(a) => void rooms.act(b.id, a)} onOpen={() => setOpenId(b.id)} />)}
            </ul>
          )}
        </div>
      )}

      {open && (
        <RoomReservationSheet booking={open} busy={rooms.busyId === open.id} onAct={(a) => void rooms.act(open.id, a)} onClose={() => setOpenId(null)}
          onOpenDesk={() => { setOpenId(null); onNavigate?.('accommodations'); }} />
      )}
    </div>
  );
}
