import React from 'react';
import type { PointWithCoords } from './chart-math.util';

interface TooltipProps {
  point: PointWithCoords | null;
  chartWidth: number;
}

export function RevenueChartTooltip({ point, chartWidth }: TooltipProps) {
  if (!point) return null;
  const leftPos = Math.max(15, Math.min(85, (point.x / chartWidth) * 100));

  return (
    <div
      className="absolute pointer-events-none bg-white/95 backdrop-blur shadow-xl border border-zinc-200 rounded-xl p-4 flex flex-col gap-1.5 transition-all z-10"
      style={{ left: `${leftPos}%`, top: '15%', transform: 'translateX(-50%)', minWidth: '140px' }}
    >
      <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{point.label}</p>
      <div className="flex flex-col gap-1">
        <p className="font-serif font-bold text-2xl text-emerald-600 leading-none">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(point.revenue)}
        </p>
        <p className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-1 rounded w-fit mt-1">
          {point.orders || 0} Orders
        </p>
      </div>
    </div>
  );
}
