'use client';

import React from 'react';
import { Trash2, Plus, X } from 'lucide-react';

interface Props {
  existingUnits: { id: string; originalNumber: string; currentNumber: string; status: string }[];
  activeTotalUnits: number;
  onRoomNumberChange: (id: string, newNum: string) => void;
  onDeleteExistingRoom: (id: string, status: string) => void;
  newUnits: string[];
  onRemoveNewRoom: (idx: number) => void;
  singleNewRoomInput: string;
  setSingleNewRoomInput: (val: string) => void;
  onAddNewRoom: () => void;
}

const inputClass = "w-full bg-neutral-50/80 border border-neutral-200 focus:border-neutral-900 text-neutral-900 rounded-xl px-4 py-3 text-sm outline-none transition-all focus:bg-white";
const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500";

export function EditCategoryUnitsTab({
  existingUnits,
  activeTotalUnits,
  onRoomNumberChange,
  onDeleteExistingRoom,
  newUnits,
  onRemoveNewRoom,
  singleNewRoomInput,
  setSingleNewRoomInput,
  onAddNewRoom
}: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-zinc-900">Physical Rooms Ingested</h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Directly edit room numbers, delete vacant units, or add new units to this category.
            </p>
          </div>
          <span className="rounded-xl border border-zinc-200 bg-white px-3 py-1 font-mono text-xs font-bold text-zinc-900">
            {activeTotalUnits} Total Units
          </span>
        </div>

        {/* Existing Rooms List */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Existing Room Units ({existingUnits.length})
          </p>

          {existingUnits.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No existing units active.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {existingUnits.map(unit => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs"
                >
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-1">
                      <span>Unit Key</span>
                      <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${unit.status === 'OCCUPIED' ? 'bg-rose-100 text-rose-700' :
                          unit.status === 'CLEANING' ? 'bg-neutral-200 text-neutral-800' :
                            'bg-emerald-100 text-emerald-700'
                        }`}>
                        {unit.status}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={unit.currentNumber}
                      onChange={(e) => onRoomNumberChange(unit.id, e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-1.5 font-mono text-sm font-bold text-zinc-900 focus:bg-white focus:border-zinc-950 outline-none transition-all"
                      placeholder="e.g. 101"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteExistingRoom(unit.id, unit.status)}
                    disabled={unit.status === 'OCCUPIED'}
                    className="rounded-xl p-2.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent transition-colors mt-4 cursor-pointer"
                    title={unit.status === 'OCCUPIED' ? 'Cannot delete occupied room' : 'Delete unit'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Newly Added Units (Pending Commit) */}
        {newUnits.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-zinc-200/80">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              New Units To Provision ({newUnits.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {newUnits.map((num, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-mono font-bold text-emerald-900 shadow-xs"
                >
                  Room {num}
                  <button
                    type="button"
                    onClick={() => onRemoveNewRoom(idx)}
                    className="text-emerald-700 hover:text-rose-600 ml-1 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add Unit Input Row */}
        <div className="pt-2 border-t border-zinc-200/60">
          <label className={labelClass}>Add New Room Unit(s)</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter room number or comma separated e.g. 105, 106"
              value={singleNewRoomInput}
              onChange={(e) => setSingleNewRoomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddNewRoom();
                }
              }}
              className={`${inputClass} font-mono`}
            />
            <button
              type="button"
              onClick={onAddNewRoom}
              disabled={!singleNewRoomInput.trim()}
              className="rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 px-5 py-2 text-xs font-bold text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Unit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
