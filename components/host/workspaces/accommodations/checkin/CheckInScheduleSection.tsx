'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

interface Props {
  checkInTime: string;
  onCheckInChange: (val: string) => void;
  checkOutTime: string;
  onCheckOutChange: (val: string) => void;
  nights: string;
  setNights: (val: string) => void;
  adultsCount: string;
  setAdultsCount: (val: string) => void;
  childrenCount: string;
  setChildrenCount: (val: string) => void;
}

const inputClass = "w-full bg-neutral-50/80 border border-neutral-200 focus:border-neutral-900 text-neutral-900 rounded-xl px-4 py-3 text-xs sm:text-sm outline-none transition-all focus:bg-white";
const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500";

export function CheckInScheduleSection({
  checkInTime,
  onCheckInChange,
  checkOutTime,
  onCheckOutChange,
  nights,
  setNights,
  adultsCount,
  setAdultsCount,
  childrenCount,
  setChildrenCount
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-xs">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
        <Calendar className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
          02. Stay Schedule & Guest Breakdown
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="checkInTime" className={labelClass}>
            Check-In Date & Time
          </label>
          <input 
            id="checkInTime"
            type="datetime-local"
            required
            value={checkInTime}
            onChange={(e) => onCheckInChange(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="checkOutTime" className={labelClass}>
            Expected Check-Out Date & Time
          </label>
          <input 
            id="checkOutTime"
            type="datetime-local"
            required
            value={checkOutTime}
            onChange={(e) => onCheckOutChange(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Duration & Occupancy Counters */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <div>
          <label htmlFor="stayNights" className={labelClass}>
            Duration (Nights)
          </label>
          <input 
            id="stayNights"
            type="number"
            min="1"
            max="90"
            value={nights}
            onChange={(e) => setNights(e.target.value)}
            className={`${inputClass} text-center font-bold`}
          />
        </div>

        <div>
          <label htmlFor="adultsCount" className={labelClass}>
            Adults (18+)
          </label>
          <input 
            id="adultsCount"
            type="number"
            min="1"
            max="10"
            value={adultsCount}
            onChange={(e) => setAdultsCount(e.target.value)}
            className={`${inputClass} text-center font-bold`}
          />
        </div>

        <div>
          <label htmlFor="childrenCount" className={labelClass}>
            Children (0-17)
          </label>
          <input 
            id="childrenCount"
            type="number"
            min="0"
            max="6"
            value={childrenCount}
            onChange={(e) => setChildrenCount(e.target.value)}
            className={`${inputClass} text-center font-bold`}
          />
        </div>
      </div>
    </div>
  );
}
