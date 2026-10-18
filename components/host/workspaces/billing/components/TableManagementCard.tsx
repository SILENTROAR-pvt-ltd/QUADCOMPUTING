'use client';

import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { RestaurantTable } from '../hooks/useTableManagement';
import { ZoneField } from './ZoneField';

interface TableManagementCardProps {
  table: RestaurantTable;
  /** The areas the venue has, offered when moving this table to another one. */
  zones?: string[];
  onUpdateTable: (id: string, num: string, cap: number, zone?: string | null) => Promise<boolean>;
  onDelete: (id: string, tableNumber: string) => void;
  onUpdateStatus: (id: string, status: string, tableNumber?: string) => void;
}

export function TableManagementCard({ table, zones = [], onUpdateTable, onDelete, onUpdateStatus }: TableManagementCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editNumber, setEditNumber] = useState(table.table_number);
  const [editCapacity, setEditCapacity] = useState(String(table.seating_capacity));
  const [editZone, setEditZone] = useState(table.zone ?? '');

  const handleSave = async () => {
    const success = await onUpdateTable(table.id, editNumber.trim().toUpperCase(), parseInt(editCapacity), editZone);
    if (success) setIsEditing(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'VACANT': return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'OCCUPIED': return 'border-rose-200 bg-rose-50 text-rose-600';
      case 'RESERVED': return 'border-blue-200 bg-blue-50 text-blue-700';
      case 'CLEANING': return 'border-sky-200 bg-sky-50 text-sky-700';
      default: return 'border-neutral-200 bg-neutral-100 text-neutral-500';
    }
  };

  const editInputClass = "w-full rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-400";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 transition-all shadow-sm hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="mt-1 flex flex-col gap-2 w-full">
              <input type="text" value={editNumber} onChange={(e) => setEditNumber(e.target.value)} className={editInputClass} placeholder="Table Number" />
              <ZoneField compact value={editZone} onChange={setEditZone} zones={zones} />
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="20" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} className={`${editInputClass} w-16 text-center`} placeholder="Seats" />
                <button type="button" onClick={handleSave} className="text-[10px] font-bold text-neutral-900 hover:underline cursor-pointer">Save</button>
                <button type="button" onClick={() => setIsEditing(false)} className="text-[10px] text-neutral-400 hover:text-neutral-700 hover:underline cursor-pointer">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="whitespace-nowrap text-sm font-bold text-neutral-900 tracking-tight">{table.table_number}</p>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusBadge(table.status)}`}>{table.status}</span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-400">{table.seating_capacity} Seats</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {!isEditing && (
            <button type="button" onClick={() => { setIsEditing(true); setEditNumber(table.table_number); setEditCapacity(String(table.seating_capacity)); setEditZone(table.zone ?? ''); }} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer" title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={() => onDelete(table.id, table.table_number)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-500 transition-colors cursor-pointer" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
        <select
          value={table.status}
          onChange={(e) => onUpdateStatus(table.id, e.target.value, table.table_number)}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300 cursor-pointer"
        >
          <option value="VACANT">Mark Vacant</option>
          <option value="OCCUPIED">Mark Occupied</option>
          <option value="RESERVED">Mark Reserved</option>
          <option value="CLEANING">Mark Cleaning</option>
        </select>
      </div>
    </div>
  );
}
