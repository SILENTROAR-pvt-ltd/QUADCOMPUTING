'use client';

import { useState, useEffect } from 'react';
import { Bed, UtensilsCrossed } from 'lucide-react';
import type { RestaurantTable } from './hooks/usePOSTables';
import { POSTableGridItem } from './components/POSTableGridItem';
import { POSRoomGridItem, type RoomOption } from './components/POSRoomGridItem';

interface Props {
  tables: RestaurantTable[];
  selectedTableId: string | null;
  setSelectedTableId: (id: string | null) => void;
  selectedTableNumber?: string;
  setSelectedTableNumber: (num: string) => void;
  selectedRoomId?: string | null;
  setSelectedRoomId?: (id: string | null) => void;
  onSelectActiveTable?: (table: RestaurantTable) => void;
  onMarkVacant?: (table: RestaurantTable) => void;
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
  onMarkVacant,
}: Props) {
  const [activeTab, setActiveTab] = useState<'tables' | 'rooms'>('tables');
  const [rooms, setRooms] = useState<RoomOption[]>([]);

  useEffect(() => {
    fetch('/api/host/accommodations/rooms')
      .then((res) => res.json())
      .then((data) => {
        if (data.rooms) setRooms(data.rooms);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedRoomId) setActiveTab('rooms');
  }, [selectedRoomId]);

  const handleSelectTakeaway = () => {
    setSelectedTableId(null);
    if (setSelectedRoomId) setSelectedRoomId(null);
    setSelectedTableNumber('Takeaway / Counter');
  };

  const handleSelectTable = (table: RestaurantTable) => {
    if (selectedTableId === table.id) {
      handleSelectTakeaway();
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
                className="text-[10px] font-bold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 uppercase tracking-wider bg-white px-2.5 py-1 rounded-lg border border-neutral-200 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Clear active order and mark table vacant"
              >
                Mark Vacant
              </button>
            )}
            <button
              type="button"
              onClick={handleSelectTakeaway}
              className="text-[10px] font-bold text-neutral-500 hover:text-neutral-900 uppercase tracking-wider bg-neutral-100 px-2 py-1 rounded-lg border border-neutral-200 transition-colors shrink-0 cursor-pointer"
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
          className={`w-full rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            !selectedTableId && !selectedRoomId
              ? 'border-neutral-300 bg-neutral-100 text-neutral-900 shadow-sm font-semibold'
              : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
          }`}
        >
          Takeaway / Quick Counter
        </button>

        <div className="max-h-36 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {activeTab === 'tables' &&
            tables.map((table) => (
              <POSTableGridItem
                key={table.id}
                table={table}
                isSelected={selectedTableId === table.id}
                onSelect={handleSelectTable}
              />
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
