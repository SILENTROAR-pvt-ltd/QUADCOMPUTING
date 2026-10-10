import type { ChartDataPoint } from '../RevenueTrendChart';

export interface PointWithCoords extends ChartDataPoint {
  x: number;
  y: number;
  idx: number;
}

export function calculateMaxRevenue(data: ChartDataPoint[]): number {
  const safeData = Array.isArray(data) ? data : [];
  const max = Math.max(10, ...safeData.map((d) => Number(d?.revenue) || 0));
  const magnitude = Math.pow(10, Math.max(1, Math.floor(Math.log10(max))));
  return Math.ceil(max / magnitude) * magnitude;
}

export function formatYAxis(val: number): string {
  if (val === 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `₹${Math.round(val)}`;
}

export function buildSvgPaths(points: PointWithCoords[], width: number, height: number, padding: { left: number; right: number; bottom: number }) {
  if (points.length === 0) return { path: '', areaPath: '' };
  if (points.length === 1) {
    const d = `M${points[0].x},${points[0].y}`;
    const a = `M${padding.left},${height - padding.bottom} L${points[0].x},${points[0].y} L${width - padding.right},${height - padding.bottom} Z`;
    return { path: d, areaPath: a };
  }

  let p = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX1 = curr.x + (next.x - curr.x) * 0.5;
    const cpY1 = curr.y;
    const cpX2 = curr.x + (next.x - curr.x) * 0.5;
    const cpY2 = next.y;
    p += ` C${cpX1},${cpY1} ${cpX2},${cpY2} ${next.x},${next.y}`;
  }
  const a = `${p} L${width - padding.right},${height - padding.bottom} L${padding.left},${height - padding.bottom} Z`;
  return { path: p, areaPath: a };
}
