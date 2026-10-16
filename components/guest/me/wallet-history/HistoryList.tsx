'use client';

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import type { HistoryRow } from '@/lib/services/wallet/wallet-history.service';
import { ListSkeleton } from '@/components/guest/shared/ListSkeleton';
import { HistoryRowItem } from './HistoryRowItem';
import { dayLabel, groupByDay } from './history-format';

const PAD = 'px-5 sm:px-6';
const GHOST = 'cursor-pointer rounded-xl border border-neutral-200 px-3 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50';

interface HistoryListProps {
  rows: HistoryRow[];
  loading: boolean;
  error: string | null;
  filtersActive: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  venueName: (id: string) => string;
  billLoading: string | null;
  onOpenBill: (orderId: string) => void;
  onRetry: () => void;
  onClear: () => void;
  onMore: () => void;
}

/** The ledger rows grouped by day, with the loading, error and empty states and paging. */
export function HistoryList(p: HistoryListProps) {
  const groups = useMemo(() => groupByDay(p.rows), [p.rows]);

  if (p.error) {
    return (
      <div className={`flex items-center justify-between gap-4 py-6 ${PAD}`}>
        <p className="text-sm text-neutral-600">{p.error}</p>
        <button type="button" onClick={p.onRetry} className={GHOST}>Try again</button>
      </div>
    );
  }
  if (p.loading && p.rows.length === 0) return <ListSkeleton label="Loading history" />;
  if (p.rows.length === 0) {
    return (
      <div className={`py-8 text-center ${PAD}`}>
        <p className="text-sm text-neutral-700">{p.filtersActive ? 'No activity matches these filters.' : 'No wallet activity yet.'}</p>
        <p className="mt-1 text-xs text-neutral-500">{p.filtersActive ? 'Try another venue, type or date.' : 'Cashback appears here once a bill settles.'}</p>
        {p.filtersActive && <button type="button" onClick={p.onClear} className={`mt-3 ${GHOST}`}>Clear filters</button>}
      </div>
    );
  }
  return (
    <div>
      {groups.map((g) => (
        <div key={g.day}>
          <p className={`sticky top-0 z-[1] bg-white/95 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 backdrop-blur ${PAD}`}>{dayLabel(g.day)}</p>
          <ul className="divide-y divide-neutral-100">
            {g.items.map((t) => <HistoryRowItem key={t.id} row={t} venueName={p.venueName(t.venue_id)} canOpenBill loadingBill={p.billLoading === t.order_id} onOpenBill={p.onOpenBill} />)}
          </ul>
        </div>
      ))}
      {p.hasMore && (
        <div className={`py-4 text-center ${PAD}`}>
          <button type="button" onClick={p.onMore} disabled={p.loadingMore} className={`inline-flex items-center gap-1.5 px-4 disabled:opacity-50 ${GHOST}`}>
            {p.loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Load more
          </button>
        </div>
      )}
    </div>
  );
}
