'use client';

import React from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { AdminTopupCard } from '@/components/admin/topup-desk/AdminTopupCard';
import { useAdminTopupDesk } from '@/components/admin/topup-desk/hooks/useAdminTopupDesk';
import { Panel, Empty } from '../ui/Panel';

const FILTERS = ['pending', 'approved', 'rejected', 'all'] as const;

/** Manual UPI / bank payments from venues (plans, the Vibey add-on, wallet top-ups), checked against the bank here. */
export function TopupQueue() {
  const d = useAdminTopupDesk();
  return (
    <Panel title="Payment approvals" note="Check the UTR in the bank first. Approving applies the plan, add-on or credit at once."
      actions={
        <button type="button" onClick={() => void d.fetchRequests()} disabled={d.loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 cursor-pointer">
          <RefreshCw className={`h-3.5 w-3.5 ${d.loading ? 'animate-spin' : ''}`} aria-hidden /> Refresh
        </button>
      }>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => d.setStatusFilter(f)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize cursor-pointer ${d.statusFilter === f ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-neutral-950'}`}>
              {f}{f === 'pending' && d.pendingCount > 0 ? ` (${d.pendingCount})` : ''}
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <input value={d.searchQuery} onChange={(e) => d.setSearchQuery(e.target.value)} placeholder="Venue or UTR" aria-label="Search payments"
            className="h-9 w-full rounded-xl border border-neutral-200 bg-white pl-8 pr-3 text-sm outline-none focus:border-neutral-900" />
        </label>
      </div>
      {d.notice && (
        <p role={d.notice.ok ? 'status' : 'alert'} className={`mb-4 rounded-xl border px-3 py-2 text-sm ${d.notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{d.notice.text}</p>
      )}
      {d.requests.length === 0
        ? <Empty>{d.loading ? 'Loading payments…' : `No ${d.statusFilter === 'all' ? '' : d.statusFilter} payment requests.`}</Empty>
        : <div className="space-y-3">{d.requests.map((r) => (
            <AdminTopupCard key={r.id} req={r} isProcessing={d.processingId === r.id} onApprove={(id) => void d.handleAction(id, 'approve')} onReject={(id) => void d.handleAction(id, 'reject')} />
          ))}</div>}
    </Panel>
  );
}
