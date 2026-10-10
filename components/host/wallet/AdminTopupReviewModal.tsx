'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ShieldCheck, RefreshCw } from 'lucide-react';
import type { VenueTopupRequest } from '@/types/wallet';
import { AdminTopupReviewItem } from './AdminTopupReviewItem';

interface AdminTopupReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApproved: () => void;
}

export function AdminTopupReviewModal({ isOpen, onClose, onApproved }: AdminTopupReviewModalProps) {
  const [requests, setRequests] = useState<VenueTopupRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/topup-requests');
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error('[AdminReview] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchRequests();
  }, [isOpen, fetchRequests]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingId(requestId);
    try {
      const res = await fetch('/api/admin/topup-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
        if (action === 'approve') onApproved();
      }
    } catch (err) {
      console.error('[AdminReview] Action error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white border border-neutral-200/90 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neutral-900 text-white"><ShieldCheck className="w-4 h-4" /></div>
            <div>
              <h3 className="font-serif text-base font-medium text-neutral-900">Admin Payment Verification Desk</h3>
              <p className="text-[11px] text-neutral-500">Approve UTRs to atomically credit wallets & clear bills</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={fetchRequests} disabled={loading} className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer" title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {requests.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">No payment verification requests found.</div>
          ) : (
            requests.map((req) => (
              <AdminTopupReviewItem
                key={req.id}
                req={req}
                isProcessing={processingId === req.id}
                onApprove={(id) => handleAction(id, 'approve')}
                onReject={(id) => handleAction(id, 'reject')}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
