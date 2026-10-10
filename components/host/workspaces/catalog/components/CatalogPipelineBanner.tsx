'use client';

import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface CatalogPipelineBannerProps {
  activeCafeId: string;
  itemCount: number;
  fetchError: string | null;
  isRefreshing: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

export const CatalogPipelineBanner: React.FC<CatalogPipelineBannerProps> = ({
  activeCafeId,
  itemCount,
  fetchError,
  isRefreshing,
  isLoading,
  onRefresh,
}) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-neutral-200/90 bg-white px-5 py-3.5 text-xs sm:text-sm text-neutral-600 shadow-2xs">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="font-semibold text-neutral-900 tracking-wide text-xs sm:text-[13px]">
          Catalog Pipeline:
        </span>
        <span className="font-mono text-neutral-500 text-xs">
          venue_id: <strong className="text-neutral-900 font-semibold">{activeCafeId.slice(0, 8)}...{activeCafeId.slice(-4)}</strong>
        </span>
        <span className="text-neutral-300 hidden sm:inline">•</span>
        <span className="text-neutral-500 hidden sm:inline text-xs sm:text-[13px]">
          <strong className="text-neutral-900 font-semibold">{itemCount}</strong> live items loaded
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        {fetchError && (
          <span className="inline-flex items-center gap-1.5 text-xs text-red-600 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="max-w-[200px] truncate" title={fetchError}>{fetchError}</span>
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing || isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/90 bg-neutral-50 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          title="Reload catalog items from Supabase"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-neutral-900' : 'text-neutral-500'}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
        </button>
      </div>
    </div>
  );
};
