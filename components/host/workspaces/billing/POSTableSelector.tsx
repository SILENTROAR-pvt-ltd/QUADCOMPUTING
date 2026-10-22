'use client';

import React, { useState, useEffect } from 'react';
import { Bed, UtensilsCrossed } from 'lucide-react';
import type { RestaurantTable } from './hooks/usePOSTables';
import { POSTableGridItem } from './components/POSTableGridItem';
import { POSRoomGridItem, type RoomOption } from './components/POSRoomGridItem';
import { groupByZone, hasZones } from '@/lib/services/table/table-zones';

interface Props {
  tables: RestaurantTable[];
  selectedTableId: string | null;
  setSelectedTableId: (id: string | null) => void;
  selectedTableNumber?: string;
  setSelectedTableNumber: (num: string) => void;
  selectedRoomId?: string | null;
  setSelectedRoomId?: (id: string | null) => void;
  onSelectActiveTable?: (table: RestaurantTable) => void;
  /** Loads the room's running folio into the POS, as picking a table loads its bill. */
  onSelectActiveRoom?: (room: RoomOption) => void;
  onMarkVacant?: (table: RestaurantTable) => void;
  /** Back to the counter: clears the table's session or the room's stay from the bill as well as the selection. */
  onSelectTakeaway?: () => void;
}

export function POSTableSelector({
  tables,
  selectedTableId,
  setSelectedTableId,
  selectedTableNumber,
  setSelectedTableNumber,
  selectedRoomId,
  setSelectedRoomId,
  onSelectActiveTable,
  onSelectActiveRoom,
  onMarkVacant,
  onSelectTakeaway,
}: Props) {
  const [activeTab, setActiveTab] = useState<'tables' | 'rooms'>('tables');
  const [rooms, setRooms] = useState<RoomOption[]>([]);

  useEffect(() => {
    const load = () => {
      fetch('/api/host/accommodations/rooms', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.rooms) setRooms(data.rooms);
        })
        .catch(() => {});
    };
    load();
    // A room checked out from the till turns vacant here at once.
    window.addEventListener('quad:rooms-changed', load);
    return () => window.removeEventListener('quad:rooms-changed', load);
  }, []);

  useEffect(() => {
    if (selectedRoomId) setActiveTab('rooms');
  }, [selectedRoomId]);

  const handleSelectTakeaway = () => {
    setSelectedTableId(null);
    if (setSelectedRoomId) setSelectedRoomId(null);
    setSelectedTableNumber('Takeaway / Counter');
    onSelectTakeaway?.();
  };

  const handleSelectTable = (table: RestaurantTable) => {
    // Tapping the table already chosen reloads its bill. It used to switch the till to the counter while keeping the
    // table's dishes, and "Settle bill" then saved them as a separate counter bill: the payment was taken twice over
    // and the table's own order stayed open. The counter is chosen with its own button.
    if (selectedTableId && selectedTableId === table.id) {
      onSelectActiveTable?.(table);
      return;
    }

    if (setSelectedRoomId) setSelectedRoomId(null);
    setSelectedTableId(table.id);
    setSelectedTableNumber(table.table_number);

    if (onSelectActiveTable) {
      onSelectActiveTable(table);
    }
  };

  const handleSelectRoom = (room: RoomOption) => {
    if (setSelectedRoomId) {
      if (selectedRoomId === room.id) {
        handleSelectTakeaway();
      } else if (onSelectActiveRoom) {
        onSelectActiveRoom(room);
      } else {
        setSelectedTableId(null);
        setSelectedRoomId(room.id);
        setSelectedTableNumber(`ROOM ${room.room_number}`);
      }
    }
  };

  const activeTable = selectedTableId ? tables.find((t) => t.id === selectedTableId) : null;
  const activeSession = activeTable?.activeSession;
  const runningAmount = activeSession
    ? Number(activeSession.subtotal) || Number(activeSession.grandTotal) || 0
    : 0;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-3 text-neutral-900">
      {/* Header with Selector Type Switch */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Order Destination</h3>

        {rooms.length > 0 && (
          <div className="flex rounded-lg bg-neutral-100 p-0.5 text-[11px] font-bold border border-neutral-200">
            <button
              type="button"
              onClick={() => setActiveTab('tables')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                activeTab === 'tables' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <UtensilsCrossed className="h-3 w-3" />
              Tables ({tables.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                activeTab === 'rooms' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Bed className="h-3 w-3" />
              Rooms ({rooms.length})
            </button>
          </div>
        )}
      </div>

      {/* Active Selection Banner */}
      {(selectedRoomId || selectedTableId) && (
        <div
          className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs border transition-all ${
            activeSession ? 'bg-blue-50 border-blue-200 text-neutral-900' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 shrink-0">
              {selectedRoomId ? <Bed className="h-3.5 w-3.5" /> : <UtensilsCrossed className="h-3.5 w-3.5" />}
            </div>
            <div className="leading-tight truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-neutral-900">
                  {selectedRoomId
                    ? `Room ${rooms.find((r) => r.id === selectedRoomId)?.room_number || (selectedTableNumber || '').replace(/^ROOM\s*/i, '')}`
                    : `Table ${selectedTableNumber || 'Counter'}`}
                </span>
                {activeSession && (
                  <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-900 border border-neutral-200">
                    ₹{runningAmount.toFixed(0)}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-neutral-500 block truncate">
                {selectedRoomId
                  ? rooms.find((r) => r.id === selectedRoomId)?.guest_name || 'In-House Guest Folio'
                  : activeSession
                  ? `Active Order • ${activeSession.itemsCount || 0} items`
                  : activeTable?.status === 'OCCUPIED'
                  ? 'Occupied (Manual Floor Status)'
                  : activeTable?.status === 'RESERVED'
                  ? 'Reserved (Manual Floor Status)'
                  : activeTable?.status === 'CLEANING'
                  ? 'Cleaning (Manual Floor Status)'
                  : 'Vacant / Available'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {activeTable && (activeSession || activeTable.status === 'OCCUPIED') && onMarkVacant && (
              <button
                type="button"
                onClick={() => onMarkVacant(activeTable)}
                className="h-9 text-[10px] font-bold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 uppercase tracking-wider bg-white px-3 rounded-lg border border-neutral-200 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Clear active order and mark table vacant"
              >
                Mark Vacant
              </button>
            )}
            <button
              type="button"
              onClick={handleSelectTakeaway}
              className="h-9 text-[10px] font-bold text-neutral-500 hover:text-neutral-900 uppercase tracking-wider bg-neutral-100 px-3 rounded-lg border border-neutral-200 transition-colors shrink-0 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Target Options Grid */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={handleSelectTakeaway}
          className={`w-full min-h-11 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] ${
            !selectedTableId && !selectedRoomId
              ? 'border-neutral-300 bg-neutral-100 text-neutral-900 shadow-sm font-semibold'
              : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
          }`}
        >
          Takeaway / Quick Counter
        </button>

        <div className="grid max-h-[38dvh] grid-cols-3 gap-1.5 overflow-y-auto overscroll-contain pr-1 lg:max-h-44 lg:grid-cols-3">
          {activeTab === 'tables' &&
            (hasZones(tables) ? groupByZone(tables) : [{ zone: null, tables }]).map((group) => (
              <React.Fragment key={group.zone ?? 'none'}>
                {hasZones(tables) && (
                  <p className="col-span-full mt-1 truncate border-b border-neutral-100 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 first:mt-0">
                    {group.zone ?? 'Other tables'}
                  </p>
                )}
                {group.tables.map((table) => (
                  <POSTableGridItem
                    key={table.id}
                    table={table}
                    isSelected={selectedTableId === table.id}
                    onSelect={handleSelectTable}
                  />
                ))}
              </React.Fragment>
            ))}

          {activeTab === 'rooms' &&
            rooms.map((room) => (
              <POSRoomGridItem
                key={room.id}
                room={room}
                isSelected={selectedRoomId === room.id}
                onSelect={handleSelectRoom}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
