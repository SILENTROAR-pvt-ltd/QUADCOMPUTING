'use client';

import React from 'react';
import { Building2, MapPin, Check, Sparkles, Clock, Wallet, Zap } from 'lucide-react';
import type { VenueTopupRequest } from '@/types/wallet';

interface AdminTopupCardProps {
  req: VenueTopupRequest;
  isProcessing: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function AdminTopupCard({ req, isProcessing, onApprove, onReject }: AdminTopupCardProps) {
  const isPending = req.status === 'pending';
  const isPlanSub = req.request_type === 'plan_subscription' || (Boolean(req.requested_plan_tier) && req.requested_plan_tier !== 'pay_as_you_go');
  const badgeStyle = req.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : req.status === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-amber-50 text-amber-900 border-amber-300';

  return (
    <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 space-y-4 shadow-2xs hover:border-neutral-300 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-100 pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif text-lg font-medium text-neutral-900 tracking-tight flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-neutral-500" />
              <span>{req.venue_name || 'Venue'}</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>{req.status}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
              isPlanSub ? 'bg-purple-50 text-purple-900 border-purple-300' : 'bg-blue-50 text-blue-900 border-blue-300'
            }`}>
              {isPlanSub ? <Zap className="w-3 h-3 text-purple-700" /> : <Wallet className="w-3 h-3 text-blue-700" />}
              {isPlanSub ? 'Plan Subscription Upgrade' : 'Wallet Top-Up'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-neutral-400" /><span>{req.venue_address || 'Old Manali, Himachal Pradesh'}</span></span>
            <span>•</span><span className="font-mono text-[11px]">ID: {req.venue_id.slice(0, 8)}...</span>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">{isPlanSub ? 'Subscription Price' : 'Top-Up Amount'}</span>
          <div className="font-sans text-2xl font-bold tabular-nums tracking-tight text-neutral-900">₹{Number(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
        <div><span className="block text-[10px] uppercase font-bold tracking-wider text-neutral-400">UTR / Ref Number</span><strong className="text-neutral-900 font-semibold">{req.utr_number}</strong></div>
        <div>
          <span className="block text-[10px] uppercase font-bold tracking-wider text-neutral-400">{isPlanSub ? 'Target Plan Tier' : 'Balance Destination'}</span>
          <strong className="text-neutral-900 font-semibold">{isPlanSub ? `${req.requested_plan_tier} (Active Tier)` : 'Spendable Wallet (+₹' + req.amount + ')'}</strong>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold tracking-wider text-neutral-400">Submission Date</span>
          <span className="flex items-center gap-1 text-neutral-700"><Clock className="w-3 h-3 text-neutral-400" /><span>{new Date(req.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></span>
        </div>
      </div>
      {isPending ? (
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" disabled={isProcessing} onClick={() => onReject(req.id)} className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50">Reject</button>
          <button type="button" disabled={isProcessing} onClick={() => onApprove(req.id)} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /><Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isProcessing ? 'Processing...' : isPlanSub ? 'Approve & Activate Subscription' : 'Approve & Credit Wallet'}</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs text-neutral-500">
          <span className="font-mono text-[11px] flex items-center gap-1.5">
            {req.status === 'approved' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="text-rose-600 font-bold">✕</span>}
            <span className={req.status === 'approved' ? 'text-emerald-700 font-medium' : 'text-rose-700 font-medium'}>
              {req.status === 'approved' ? 'Verified & Approved' : `Rejected (${req.notes || 'Failed'})`}
            </span>
            {req.reviewed_by && <span className="text-neutral-400">• By {req.reviewed_by}</span>}
          </span>
          {req.reviewed_at && (
            <span className="text-[11px] font-mono text-neutral-400">
              {new Date(req.reviewed_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}



