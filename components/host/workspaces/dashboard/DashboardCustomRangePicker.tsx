'use client';

import React from 'react';

interface DashboardCustomRangePickerProps {
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  onApplyCustomRange: () => void;
}

export function DashboardCustomRangePicker({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onApplyCustomRange,
}: DashboardCustomRangePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-neutral-500">From:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-900 focus:ring-1 focus:ring-neutral-400 outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-neutral-500">To:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-900 focus:ring-1 focus:ring-neutral-400 outline-none"
        />
      </div>
      <button
        onClick={onApplyCustomRange}
        disabled={!startDate || !endDate}
        className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-all cursor-pointer"
      >
        Apply Filter
      </button>
    </div>
  );
}
