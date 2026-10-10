'use client';

import React from 'react';
import { Bed } from 'lucide-react';

export interface RoomOption {
  id: string;
  room_number: string;
  status: string;
  guest_name?: string | null;
  category?: { name: string };
}

interface POSRoomGridItemProps {
  room: RoomOption;
  isSelected: boolean;
  onSelect: (room: RoomOption) => void;
}

export const POSRoomGridItem: React.FC<POSRoomGridItemProps> = ({
  room,
  isSelected,
  onSelect,
}) => {
  const isOccupied = room.status === 'OCCUPIED';

  return (
    <button
      type="button"
      onClick={() => onSelect(room)}
      className={`rounded-xl border p-2 text-left transition-all relative cursor-pointer ${
        isSelected
          ? 'border-neutral-300 bg-neutral-100 text-neutral-900 shadow-sm ring-2 ring-neutral-200'
          : isOccupied
          ? 'border-blue-200 bg-blue-50 text-blue-900 hover:border-blue-300'
          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
      }`}
    >
      <div className="flex items-center gap-1">
        <Bed className={`h-3 w-3 shrink-0 ${isSelected ? 'text-neutral-700' : isOccupied ? 'text-blue-500' : 'text-neutral-400'}`} />
        <p className="text-xs font-bold truncate">Room {room.room_number}</p>
      </div>
      <p className="text-[9px] mt-0.5 opacity-75 truncate text-neutral-500">
        {room.guest_name ? room.guest_name : room.status}
      </p>
    </button>
  );
};
