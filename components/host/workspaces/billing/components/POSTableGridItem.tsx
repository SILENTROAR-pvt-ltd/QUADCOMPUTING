'use client';

import React from 'react';
import type { RestaurantTable } from '../hooks/usePOSTables';

interface POSTableGridItemProps {
  table: RestaurantTable;
  isSelected: boolean;
  onSelect: (table: RestaurantTable) => void;
}

export const POSTableGridItem: React.FC<POSTableGridItemProps> = ({
  table,
  isSelected,
  onSelect,
}) => {
  const session = table.activeSession;
  const isBillRequested = session?.status === 'bill_requested';
  const isOpen = session?.status === 'open';
  const isManualOccupied = table.status === 'OCCUPIED' && !session;
  const isReserved = table.status === 'RESERVED';
  const isCleaning = table.status === 'CLEANING';

  return (
    <button
      type="button"
      onClick={() => onSelect(table)}
      className={`min-h-[56px] min-w-0 rounded-xl border p-2 text-left transition-all relative cursor-pointer active:scale-[0.97] ${
        isSelected
          ? 'border-neutral-400 bg-neutral-100 text-neutral-900 shadow-sm ring-2 ring-neutral-200'
          : isBillRequested
          ? 'border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100 ring-1 ring-orange-200 shadow-sm'
          : isOpen
          ? 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100 shadow-sm'
          : isManualOccupied
          ? 'border-rose-200 bg-rose-50/70 text-rose-900 hover:bg-rose-100/70 shadow-2xs'
          : isReserved
          ? 'border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100/70 shadow-2xs'
          : isCleaning
          ? 'border-sky-200 bg-sky-50/70 text-sky-900 hover:bg-sky-100/70 shadow-2xs'
          : 'border-neutral-200/90 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 shadow-2xs'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold leading-tight">{table.table_number}</p>
        {isBillRequested ? (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
          </span>
        ) : isOpen ? (
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
        ) : isManualOccupied ? (
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        ) : isReserved ? (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        ) : isCleaning ? (
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        ) : null}
      </div>

      {isBillRequested ? (
        <p className="text-[10px] font-bold mt-1 truncate text-orange-700">
          Bill Req • ₹{session.subtotal.toFixed(0)}
        </p>
      ) : isOpen ? (
        <p className="text-[10px] font-bold mt-1 truncate text-blue-700">
          Active • ₹{session.subtotal.toFixed(0)}
        </p>
      ) : isManualOccupied ? (
        <p className="text-[10px] font-semibold mt-0.5 truncate text-rose-600">
          {table.seating_capacity} seats &bull; Occupied
        </p>
      ) : isReserved ? (
        <p className="text-[10px] font-semibold mt-0.5 truncate text-amber-700">
          {table.seating_capacity} seats &bull; Reserved
        </p>
      ) : isCleaning ? (
        <p className="text-[10px] font-semibold mt-0.5 truncate text-sky-700">
          {table.seating_capacity} seats &bull; Cleaning
        </p>
      ) : (
        <p className="text-[10px] opacity-60 mt-0.5 truncate text-neutral-500">
          {table.seating_capacity} seats &bull; Vacant
        </p>
      )}
    </button>
  );
};
