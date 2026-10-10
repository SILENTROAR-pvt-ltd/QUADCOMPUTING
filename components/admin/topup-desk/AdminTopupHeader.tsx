'use client';

import React from 'react';
import { ShieldCheck, RefreshCw, Search, Lock } from 'lucide-react';
import type { TopupRequestStatus } from '@/types/wallet';

interface AdminTopupHeaderProps {
  pendingCount: number;
  loading: boolean;
  statusFilter: TopupRequestStatus | 'all';
  searchQuery: string;
  onFilterChange: (status: TopupRequestStatus | 'all') => void;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
}

export function AdminTopupHeader({
  pendingCount,
  loading,
  statusFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onRefresh,
}: AdminTopupHeaderProps) {
  return (
    <header className="space-y-4 pb-6 border-b border-neutral-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-medium tracking-tight text-neutral-900">
                Admin Payment Verification Desk
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-900 text-emerald-400">
                <Lock className="w-2.5 h-2.5" /> Secure Admin
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Strictly isolated manual UTR review workspace. Review, approve, or reject top-up requests.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-800 shadow-2xs transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Desk</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200/80 self-start">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onFilterChange(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {st} {st === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="Search venue, UTR or ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9.5 pl-9 pr-3.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
          />
        </div>
      </div>
    </header>
  );
}
