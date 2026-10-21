'use client';

import React from 'react';
import type { PhysicalRoom, RoomCategory } from '@/types';
import { BedDouble, Plus, SearchX } from 'lucide-react';
import { RoomCard } from './RoomCard';
import { FrontDeskMetricsRibbon } from './components/FrontDeskMetricsRibbon';
import { FrontDeskToolbar } from './components/FrontDeskToolbar';
import { ArrivalsStrip } from './components/ArrivalsStrip';
import { displayStatus, inr, type DisplayStatus } from './room-status-style';
import type { Reservation } from './hooks/useAccommodationsData';

interface Props {
  rooms: PhysicalRoom[];
  categories: RoomCategory[];
  reservations: Reservation[];
  isLoading: boolean;
  isRefreshing?: boolean;
  statusFilter: 'ALL' | DisplayStatus;
  categoryFilter: string;
  searchQuery: string;
  onOpenBookings: () => void;
  onStatusFilterChange: (status: 'ALL' | DisplayStatus) => void;
  onCategoryFilterChange: (catId: string) => void;
  onSearchQueryChange: (query: string) => void;
  onRefresh: () => void;
  onOpenAddUnit: () => void;
  onSelectRoom: (room: PhysicalRoom) => void;
  onEditRoom: (room: PhysicalRoom) => void;
  onSwitchToConfigurator: () => void;
}

function matches(room: PhysicalRoom, p: Props): boolean {
  if (p.statusFilter !== 'ALL' && displayStatus(room) !== p.statusFilter) return false;
  if (p.categoryFilter !== 'ALL' && room.category_id !== p.categoryFilter) return false;
  const q = p.searchQuery.trim().toLowerCase();
  if (!q) return true;
  return [room.room_number, room.guest_name, room.guest_phone, room.category?.name, room.reserved_for?.guest_name, room.reserved_for?.confirmation_code].some((v) => String(v || '').toLowerCase().includes(q));
}

/** The live front desk: summary, filters, and every room grouped by category. */
export function FrontDeskGrid(p: Props) {
  const { rooms, categories } = p;
  const count = (s: DisplayStatus) => rooms.filter((r) => displayStatus(r) === s).length;
  const counts = { ALL: rooms.length, VACANT: count('VACANT'), RESERVED: count('RESERVED'), OCCUPIED: count('OCCUPIED'), CLEANING: count('CLEANING'), MAINTENANCE: count('MAINTENANCE') };
  // Natural order, so room 99 comes before room 101.
  const filtered = rooms.filter((r) => matches(r, p))
    .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
  const groups = new Map<string, { category?: RoomCategory; rooms: PhysicalRoom[] }>();
  for (const room of filtered) {
    const id = room.category_id || 'uncategorised';
    if (!groups.has(id)) groups.set(id, { category: categories.find((c) => c.id === id) || room.category, rooms: [] });
    groups.get(id)!.rooms.push(room);
  }

  return (
    <div className="space-y-6">
      <FrontDeskMetricsRibbon
        isLoading={p.isLoading}
        total={counts.ALL} vacant={counts.VACANT} reserved={counts.RESERVED} occupied={counts.OCCUPIED} cleaning={counts.CLEANING} maintenance={counts.MAINTENANCE}
        occupancyRate={counts.ALL ? Math.round((counts.OCCUPIED / counts.ALL) * 100) : 0}
        totalFolioBilling={rooms.reduce((a, r) => a + (r.activeOrdersTotal || 0), 0)}
        totalKOTs={rooms.reduce((a, r) => a + (r.activeOrdersCount || 0), 0)}
      />

      {!p.isLoading && <ArrivalsStrip reservations={p.reservations} rooms={rooms} onOpenRoom={p.onSelectRoom} onOpenBookings={p.onOpenBookings} />}

      <FrontDeskToolbar
        counts={counts} statusFilter={p.statusFilter} onStatusFilterChange={p.onStatusFilterChange}
        categories={categories} categoryFilter={p.categoryFilter} onCategoryFilterChange={p.onCategoryFilterChange}
        searchQuery={p.searchQuery} onSearchQueryChange={p.onSearchQueryChange}
        isRefreshing={Boolean(p.isRefreshing || p.isLoading)} onRefresh={p.onRefresh} onOpenAddUnit={p.onOpenAddUnit}
      />

      {p.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100/70" />)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <BedDouble className="mx-auto h-8 w-8 text-neutral-400" />
          <h3 className="mt-3 font-serif text-xl text-neutral-950">No rooms yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">Create a room category in the configurator; its rooms appear here, ready for check-in.</p>
          <button type="button" onClick={p.onSwitchToConfigurator} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer">
            <Plus className="h-4 w-4" /> Create a room category
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
          <SearchX className="mx-auto mb-2 h-6 w-6 text-neutral-400" />No rooms match these filters.
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([id, g]) => (
            <section key={id} aria-label={g.category?.name || 'Rooms'} className="space-y-3">
              <div className="flex items-baseline justify-between gap-3 border-b border-neutral-200 pb-2">
                <h2 className="flex items-baseline gap-2 font-serif text-xl text-neutral-950">
                  {g.category?.name || 'Other rooms'}
                  <span className="font-sans text-xs text-neutral-500">{g.rooms.length} room{g.rooms.length === 1 ? '' : 's'}</span>
                </h2>
                {Number(g.category?.price) > 0 && <span className="text-sm font-semibold text-neutral-900">{inr(Number(g.category?.price))}<span className="text-xs font-normal text-neutral-500"> / night</span></span>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {g.rooms.map((room) => <RoomCard key={room.id} room={room} onSelect={p.onSelectRoom} onEdit={p.onEditRoom} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
