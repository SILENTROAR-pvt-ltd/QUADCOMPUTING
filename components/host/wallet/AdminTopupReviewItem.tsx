'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { VenueTopupRequest } from '@/types/wallet';

interface AdminTopupReviewItemProps {
  req: VenueTopupRequest;
  isProcessing: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function AdminTopupReviewItem({
  req,
  isProcessing,
  onApprove,
  onReject,
}: AdminTopupReviewItemProps) {
  const badgeColor =
    req.status === 'approved'
      ? 'bg-emerald-100 text-emerald-800'
      : req.status === 'rejected'
      ? 'bg-rose-100 text-rose-800'
      : 'bg-amber-100 text-amber-900';

  return (
    <div className="p-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
            {req.status}
          </span>
          <span className="font-mono text-xs font-semibold text-neutral-900">₹{Number(req.amount).toFixed(2)}</span>
          <span className="text-neutral-400 font-mono text-[11px]">UTR: {req.utr_number}</span>
        </div>
        <div className="text-[11px] text-neutral-500 font-mono">
          Venue: {req.venue_id.slice(0, 8)}... | Plan: {req.requested_plan_tier || 'Wallet Credit'}
        </div>
      </div>

      {req.status === 'pending' && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onReject(req.id)}
            className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onApprove(req.id)}
            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isProcessing ? 'Processing...' : 'Approve & Unlock'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
