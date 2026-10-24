'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { ago } from '../ui/format';

export const RANGES = [{ days: 7, label: 'Last 7 days' }, { days: 30, label: 'Last 30 days' }, { days: 90, label: 'Last 90 days' }] as const;

/** "Welcome back": the period picker, when the figures were read, and the way into the full analytics. */
export function WelcomeHeader({ name, days, onDays, updatedAt, loading, onRefresh }: {
  name: string | null; days: number; onDays: (d: number) => void; updatedAt: number | null; loading: boolean; onRefresh: () => void;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-neutral-950">Welcome back{name ? `, ${name}` : ''}!</h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Here&apos;s what&apos;s happening across Vibers Connect.{' '}
          <button type="button" onClick={onRefresh} className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-900 cursor-pointer">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} aria-hidden /> {updatedAt ? `updated ${ago(new Date(updatedAt).toISOString())}` : 'loading'}
          </button>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <label className="relative">
          <span className="sr-only">Period</span>
          <select value={days} onChange={(e) => onDays(Number(e.target.value))}
            className="h-10 appearance-none rounded-xl border border-[#e3e3df] bg-white pl-4 pr-9 text-[13px] font-medium text-neutral-800 outline-none focus:border-neutral-900 cursor-pointer">
            {RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-neutral-500" aria-hidden />
        </label>
        <Link href="/admin/analytics" className="inline-flex h-10 items-center rounded-xl bg-[#0b0b0b] px-4 text-[13px] font-semibold text-white hover:bg-neutral-800">View analytics</Link>
      </div>
    </header>
  );
}
