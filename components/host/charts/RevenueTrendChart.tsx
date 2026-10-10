import React, { useState, useMemo, useEffect } from 'react';
import { calculateMaxRevenue, formatYAxis, buildSvgPaths, type PointWithCoords } from './revenue-chart/chart-math.util';
import { RevenueChartTooltip } from './revenue-chart/RevenueChartTooltip';

export interface ChartDataPoint {
  label: string;
  revenue: number;
  orders: number;
  timestamp: string;
}

interface RevenueTrendChartProps {
  data: ChartDataPoint[];
  timeframe: string;
  isLoading: boolean;
}

const PADDING = { top: 20, right: 20, bottom: 30, left: 65 };
const W = 800, H = 240;

export function RevenueTrendChart({ data = [], timeframe, isLoading }: RevenueTrendChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  useEffect(() => { setHoverIdx(null); }, [data, timeframe]);

  const safeData = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const maxRevenue = useMemo(() => calculateMaxRevenue(safeData), [safeData]);
  const yTicks = useMemo(() => [0, maxRevenue / 4, maxRevenue / 2, (3 * maxRevenue) / 4, maxRevenue], [maxRevenue]);
  const drawW = W - PADDING.left - PADDING.right, drawH = H - PADDING.top - PADDING.bottom;

  const points: PointWithCoords[] = useMemo(() => safeData.map((d, idx) => ({
    x: PADDING.left + (idx / Math.max(1, safeData.length - 1)) * drawW,
    y: PADDING.top + drawH - ((Number(d?.revenue) || 0) / (maxRevenue || 1)) * drawH,
    idx, label: d?.label || '', revenue: Number(d?.revenue) || 0, orders: Number(d?.orders) || 0, timestamp: d?.timestamp || '',
  })), [safeData, drawW, drawH, maxRevenue]);

  const { path, areaPath } = useMemo(() => buildSvgPaths(points, W, H, PADDING), [points]);

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-zinc-50 rounded-xl border border-zinc-100 animate-pulse">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Aggregating Sales</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[300px] bg-zinc-50 rounded-xl border border-zinc-100 overflow-hidden font-sans select-none">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((val, i) => (
          <g key={i}>
            <line x1={PADDING.left} y1={PADDING.top + drawH - (val / (maxRevenue || 1)) * drawH} x2={W - PADDING.right} y2={PADDING.top + drawH - (val / (maxRevenue || 1)) * drawH} stroke="#e4e4e7" strokeDasharray="4 4" />
            <text x={PADDING.left - 10} y={PADDING.top + drawH - (val / (maxRevenue || 1)) * drawH + 4} textAnchor="end" className="text-[10px] font-semibold fill-zinc-400">{formatYAxis(val)}</text>
          </g>
        ))}
        {points.map((pt, i) => {
          const show = points.length <= 7 || i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 5) === 0;
          return show ? <text key={i} x={pt.x} y={H - 10} textAnchor="middle" className="text-[10px] font-semibold fill-zinc-400">{pt.label}</text> : null;
        })}
        <path d={areaPath} fill="url(#revenue-gradient)" className="animate-in fade-in duration-1000" />
        <path d={path} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 4px 6px rgba(16, 185, 129, 0.3))' }} />
        {points.map((pt, i) => (
          <g key={i}>
            {hoverIdx === i && (
              <>
                <line x1={pt.x} y1={PADDING.top} x2={pt.x} y2={H - PADDING.bottom} stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={pt.x} cy={pt.y} r="4" fill="#10b981" stroke="#fff" strokeWidth="2" className="drop-shadow-sm" />
              </>
            )}
            <rect x={pt.x - (drawW / Math.max(1, points.length)) / 2} y={0} width={drawW / Math.max(1, points.length)} height={H} fill="transparent" onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} className="cursor-crosshair outline-none" />
          </g>
        ))}
      </svg>
      <RevenueChartTooltip point={hoverIdx !== null ? points[hoverIdx] : null} chartWidth={W} />
    </div>
  );
}
