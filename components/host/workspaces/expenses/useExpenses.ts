'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { currentPeriod } from '@/lib/services/expenses/period.util';
import type { PayrollRow } from '@/lib/services/expenses/payroll.util';
import { send } from './expenses-format';

export interface PayrollData { rows: PayrollRow[]; totals: { headcount: number; payable: number; advances: number; paid: number; outstanding: number }; needs_update: boolean }
export interface BillsData {
  bills: any[]; recurring_due: any[]; needs_update: boolean;
  summary: { paid: number; pending: number; overdue: number; total: number; count: number; categories: Array<{ name: string; amount: number }> };
}

/** The selected month's payroll and bills, reloaded after every change. */
export function useExpenses() {
  const [period, setPeriod] = useState(currentPeriod());
  const [payroll, setPayroll] = useState<PayrollData | null>(null);
  const [bills, setBills] = useState<BillsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const req = useRef(0);

  const load = useCallback(async () => {
    const id = ++req.current;
    setIsLoading(true);
    try {
      const [p, b] = await Promise.all([send(`/api/host/expenses/staff?period=${period}`, 'GET'), send(`/api/host/expenses/bills?period=${period}`, 'GET')]);
      if (id !== req.current) return;
      setPayroll(p); setBills(b); setError(null);
    } catch (e: any) {
      if (id === req.current) setError(e.message);
    } finally {
      if (id === req.current) setIsLoading(false);
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);
  return { period, setPeriod, payroll, bills, error, isLoading, reload: load };
}
