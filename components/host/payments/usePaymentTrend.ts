'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/utils/api-client';
import { currentBillingDay, shiftDay } from '@/lib/services/wallet/billing-day';
import type { DaySlip } from '@/lib/services/wallet/day-slips.util';
import type { MethodTotal } from './PaymentMethodSplit';

export type TrendDays = 7 | 14 | 30;
export interface TrendPoint { day: string; label: string; revenue: number; fees: number; bills: number }

const METHODS: Array<Pick<MethodTotal, 'method' | 'label'>> = [
  { method: 'UPI', label: 'UPI' }, { method: 'CASH', label: 'Cash' }, { method: 'CARD', label: 'Card' }, { method: 'OTHER', label: 'Other' },
];
const shortDay = (day: string) => new Date(`${day}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/** Pure: every day of the range (empty days as zero), and revenue by payment method. */
export function trendFrom(days: DaySlip[], from: string, count: number) {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const points: TrendPoint[] = Array.from({ length: count }, (_, i) => {
    const day = shiftDay(from, i);
    const d = byDay.get(day);
    return { day, label: shortDay(day), revenue: d?.revenue ?? 0, fees: d?.fees ?? 0, bills: d?.bills ?? 0 };
  });
  const methods: MethodTotal[] = METHODS.map((m) => ({ ...m, amount: 0, bills: 0 }));
  for (const d of days) for (const r of d.rows) {
    const key = ['UPI', 'CASH', 'CARD'].includes(String(r.payment_method)) ? r.payment_method : 'OTHER';
    const slot = methods.find((m) => m.method === key)!;
    slot.amount = Math.round((slot.amount + r.grand_total) * 100) / 100;
    slot.bills += 1;
  }
  return { points, methods };
}

/** Billing days for the charts: the last 7, 14 or 30, ending today (10 AM to 10 PM, closing at 10 PM IST). */
export function usePaymentTrend(span: TrendDays) {
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [methods, setMethods] = useState<MethodTotal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const to = currentBillingDay();
    const from = shiftDay(to, -(span - 1));
    const res = await apiRequest<any>(`/api/host/wallet/day-slips?from=${from}&to=${to}`, { cache: 'no-store' });
    if (res.ok && res.data?.success) {
      const t = trendFrom(res.data.days ?? [], from, span);
      setPoints(t.points); setMethods(t.methods); setError(null);
    } else {
      setError(res.data?.error || 'Charts could not be loaded.');
    }
    setLoaded(true);
  }, [span]);

  useEffect(() => {
    void load();
    const onRefresh = () => { void load(); };
    window.addEventListener('wallet:refresh', onRefresh);
    return () => window.removeEventListener('wallet:refresh', onRefresh);
  }, [load]);

  return { points, methods, loaded, error, retry: load };
}
