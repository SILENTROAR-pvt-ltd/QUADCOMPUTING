'use client';

import React from 'react';
import { KeyRound } from 'lucide-react';

interface Props {
  roomNumber: string;
  setRoomNumber: (val: string) => void;
  categoryName: string;
  roomPrice: number;
}

const inputClass = "w-full bg-neutral-50/80 border border-neutral-200 focus:border-neutral-900 text-neutral-900 rounded-xl px-4 py-3 text-xs sm:text-sm outline-none transition-all focus:bg-white";
const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500";

export function CheckInKeySection({
  roomNumber,
  setRoomNumber,
  categoryName,
  roomPrice
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-zinc-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
            00. Assigned Room / Key Allocation *
          </h3>
        </div>
        <span className="rounded-md bg-white border border-zinc-200 px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-600">
          Physical Unit Allocation
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div>
          <label htmlFor="checkInRoomNumber" className={labelClass}>
            Room / Key Number *
          </label>
          <input
            id="checkInRoomNumber"
            type="text"
            required
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="e.g. 101, Villa-A, Suite 2"
            className={`${inputClass} font-mono font-bold text-sm bg-white`}
          />
          <p className="mt-1 text-[11px] text-zinc-400">
            Confirm or reassign the physical room number for this guest.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 text-xs space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Category & Tariff</p>
          <p className="font-serif text-sm font-medium text-zinc-900">{categoryName}</p>
          <p className="font-mono text-zinc-700 font-semibold">₹{roomPrice.toLocaleString()} / night</p>
        </div>
      </div>
    </div>
  );
}
