'use client';

import React from 'react';
import type { StayHistoryMetrics } from '@/types';
import { CheckCircle2, TrendingUp, Clock, Users } from 'lucide-react';

interface Props {
  metrics: StayHistoryMetrics;
}

export function StayHistoryMetricsRibbon({ metrics }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Total Completed Checkouts */}
      <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between text-neutral-500">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Completed Checkouts</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-serif text-3xl font-medium text-neutral-900">
            {metrics.totalCheckouts}
          </span>
          <span className="text-xs font-medium text-neutral-500">stays</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 border border-emerald-200/60">
            {metrics.checkoutsThisMonth} this month
          </span>
        </div>
      </div>

      {/* Metric 2: Total Revenue Generated */}
      <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between text-neutral-500">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Total Revenue</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <TrendingUp className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="font-mono text-2xl font-bold text-neutral-900">
            ₹{metrics.totalRevenue.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-500">
          Settled via room tariffs, add-ons & F&B
        </div>
      </div>

      {/* Metric 3: Average Length of Stay */}
      <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between text-neutral-500">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Avg Length of Stay</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
            <Clock className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-serif text-3xl font-medium text-neutral-900">
            {metrics.avgLengthOfStay || 1}
          </span>
          <span className="text-xs font-medium text-neutral-500">Nights / booking</span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-500">
          Based on completed checkout logs
        </div>
      </div>

      {/* Metric 4: Total Guests Hosted */}
      <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between text-neutral-500">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Guests Hosted</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
            <Users className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-serif text-3xl font-medium text-neutral-900">
            {metrics.totalGuestsHosted || metrics.totalCheckouts}
          </span>
          <span className="text-xs font-medium text-neutral-500">patrons</span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-500">
          All-time checked-in guest roster
        </div>
      </div>
    </div>
  );
}
