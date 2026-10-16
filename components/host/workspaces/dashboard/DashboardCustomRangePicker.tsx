'use client';

import React from 'react';
import { businessDateString } from '@/lib/utils/business-day';

interface DashboardCustomRangePickerProps {
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  onApplyCustomRange: () => void;
}

const MAX_DAYS = 366;
const field = 'h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none';

/** Why a range cannot be applied, or null when it can. Dates are YYYY-MM-DD in India time. */
export function rangeProblem(from: string, to: string, today: string): string | null {
  if (!from || !to) return 'Choose both dates.';
  if (from > to) return 'The start date must be on or before the end date.';
  if (to > today) return 'The end date cannot be in the future.';
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
  if (days > MAX_DAYS) return 'Choose a range of a year or less.';
  return null;
}

/** From and To dates on their own row, full width on a phone, with the reason shown when a range cannot be applied. */
export function DashboardCustomRangePicker({ startDate, setStartDate, endDate, setEndDate, onApplyCustomRange }: DashboardCustomRangePickerProps) {
  const today = businessDateString();
  const problem = rangeProblem(startDate, endDate, today);

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!problem) onApplyCustomRange(); }}
      className="grid grid-cols-2 items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-3 sm:flex sm:flex-wrap">
      <label className="min-w-0 sm:w-44">
        <span className="mb-1 block text-[11px] font-semibold text-neutral-600">From</span>
        <input type="date" value={startDate} max={endDate || today} onChange={(e) => setStartDate(e.target.value)} className={field} />
      </label>
      <label className="min-w-0 sm:w-44">
        <span className="mb-1 block text-[11px] font-semibold text-neutral-600">To</span>
        <input type="date" value={endDate} min={startDate || undefined} max={today} onChange={(e) => setEndDate(e.target.value)} className={field} />
      </label>
      <button type="submit" disabled={Boolean(problem)}
        className="col-span-2 h-10 cursor-pointer rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1">
        Apply range
      </button>
      {problem && (startDate || endDate) && <p role="alert" className="col-span-2 text-xs text-rose-700 sm:basis-full">{problem}</p>}
    </form>
  );
}
