import { useState, useEffect, useCallback } from 'react';
import type { VenueTopupRequest, TopupRequestStatus } from '@/types/wallet';

/** The payment verification queue: read on open and every 30 s while visible; approve or reject with a visible result. */
export function useAdminTopupDesk() {
  const [requests, setRequests] = useState<VenueTopupRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TopupRequestStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/topup-requests?status=${statusFilter}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) setRequests(data.requests);
      else setNotice({ ok: false, text: data.error || 'Could not load the payment requests.' });
    } catch {
      setNotice({ ok: false, text: 'Network error while loading payment requests.' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchRequests();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void fetchRequests(); }, 30_000);
    return () => clearInterval(timer);
  }, [fetchRequests]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject', reason?: string) => {
    setProcessingId(requestId);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/topup-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The reviewer is taken from the admin's session on the server.
        body: JSON.stringify({ requestId, action, reason }),
      });
      const data = await res.json().catch(() => null);
      if (data?.success) {
        setNotice({ ok: true, text: action === 'approve' ? 'Approved: the plan or credit is applied.' : 'Rejected: the venue sees the reason.' });
        void fetchRequests();
      } else {
        setNotice({ ok: false, text: data?.error || data?.message || `Could not ${action} (HTTP ${res.status}).` });
      }
    } catch {
      setNotice({ ok: false, text: 'Network error. Nothing was changed.' });
    } finally {
      setProcessingId(null);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredRequests = q
    ? requests.filter((r) => (r.venue_name || '').toLowerCase().includes(q) || r.utr_number.toLowerCase().includes(q) || r.venue_id.toLowerCase().includes(q))
    : requests;

  return {
    requests: filteredRequests,
    totalCount: requests.length,
    pendingCount: requests.filter((r) => r.status === 'pending').length,
    loading,
    processingId,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    fetchRequests,
    handleAction,
    notice,
  };
}
