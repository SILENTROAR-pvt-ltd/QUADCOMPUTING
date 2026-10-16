'use client';

import { useMemo, useState } from 'react';
import { istToday, shiftDay, type Period } from '../wallet-history/history-format';

/** A period choice ("all time", last 7 or 30 days, or custom dates) resolved to the from/to days the server is asked for. */
export function usePeriodFilter() {
  const [period, setPeriod] = useState<Period>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const range = useMemo(() => {
    if (period === 'all') return { from: '', to: '' };
    if (period === '7' || period === '30') {
      const end = istToday();
      return { from: shiftDay(end, period === '7' ? -6 : -29), to: end };
    }
    return { from, to };
  }, [period, from, to]);

  return { period, setPeriod, from, setFrom, to, setTo, range, reset: () => { setPeriod('all'); setFrom(''); setTo(''); } };
}
