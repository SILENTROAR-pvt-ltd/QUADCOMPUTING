'use client';

import React from 'react';
import { Database, AlertCircle, RefreshCw, Sparkles, Plus, Search } from 'lucide-react';
import type { FilterCategory } from './CatalogToolbar';

interface CatalogEmptyStateProps {
  isLoading: boolean;
  activeCafeId: string;
  totalActiveItems: number;
  searchQuery: string;
  filterCategory: FilterCategory;
  fetchError: string | null;
  onRetry: () => void;
  onOpenAiIngest: () => void;
  onOpenManualIngest: (kind: 'food' | 'room' | 'service') => void;
  onClearFilters: () => void;
}

export const CatalogEmptyState: React.FC<CatalogEmptyStateProps> = ({
  isLoading,
  activeCafeId,
  totalActiveItems,
  searchQuery,
  filterCategory,
  fetchError,
  onRetry,
  onOpenAiIngest,
  onOpenManualIngest,
  onClearFilters,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center h-[400px]">
        <div className="w-10 h-10 rounded-full border-2 border-neutral-700 border-t-white animate-spin mb-4" />
        <h3 className="font-serif text-lg font-medium text-white">Connecting to Menu Catalog...</h3>
        <p className="mt-1 text-xs text-neutral-500 font-mono">
          Querying Supabase catalog for venue: {activeCafeId}
        </p>
      </div>
    );
  }

  // True empty database state (no items in catalog)
  if (totalActiveItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center min-h-[400px]">
        <div className="h-16 w-16 rounded-2xl bg-neutral-950 flex items-center justify-center mb-4 text-neutral-400 border border-neutral-800">
          <Database className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="font-serif text-xl font-medium text-white">No Menu Items Found</h3>
        <p className="mt-1.5 max-w-md text-sm text-neutral-400">
          No active items are registered in Supabase (<code className="font-mono text-xs bg-neutral-950 px-1 py-0.5 rounded text-neutral-300">catalog_items</code> / <code className="font-mono text-xs bg-neutral-950 px-1 py-0.5 rounded text-neutral-300">menu_items</code>) matching this venue.
        </p>

        {/* Clean Diagnostic State */}
        <div className="mt-5 w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 text-left font-mono text-xs text-neutral-300 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-white mb-2">
            <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>Tenant Diagnostic State</span>
          </div>
          <div className="space-y-1 text-[11px] text-neutral-400">
            <p><span className="text-neutral-500">Active cafe_id:</span> <span className="text-white font-medium">{activeCafeId}</span></p>
            <p><span className="text-neutral-500">Query Filter:</span> business_id.eq / location_id.eq in catalog_items & cafe_id.eq in menu_items</p>
            {fetchError && (
              <p className="text-neutral-300 font-semibold"><span className="text-neutral-500">Error Detail:</span> {fetchError}</p>
            )}
            <p className="text-neutral-500"><span className="text-neutral-400">Resolution:</span> Ensure rows exist in database with matching ID or seed items using buttons below.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs font-semibold text-neutral-200 hover:text-white hover:border-neutral-700 shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-neutral-400" />
            <span>Retry Supabase Query</span>
          </button>
          <button
            onClick={onOpenAiIngest}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black px-4 py-2 text-xs font-semibold hover:bg-neutral-200 shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-black" />
            <span>Seed with AI Menu Ingest</span>
          </button>
          <button
            onClick={() => onOpenManualIngest('food')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:border-neutral-700 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-neutral-400" />
            <span>+ Add Item Manually</span>
          </button>
        </div>
      </div>
    );
  }

  // Filtered empty state (items exist, but filters matched 0)
  return (
    <div className="flex flex-col items-center justify-center p-20 text-center h-[400px]">
      <div className="h-16 w-16 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center mb-6">
        <Search className="w-6 h-6 text-neutral-500" />
      </div>
      <h3 className="font-serif text-xl text-white">No items match your filter</h3>
      <p className="mt-2 max-w-sm text-sm text-neutral-400">
        {searchQuery ? `No items found matching "${searchQuery}".` : `No items found in filter "${filterCategory}".`}
      </p>
      <button
        onClick={onClearFilters}
        className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:border-neutral-700 cursor-pointer shadow-xs transition-colors"
      >
        Clear Filters
      </button>
    </div>
  );
};
