import { useState, useEffect, useCallback } from 'react';
import type { VenueTopupRequest, TopupRequestStatus } from '@/types/wallet';

export function useAdminTopupDesk() {
  const [requests, setRequests] = useState<VenueTopupRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TopupRequestStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/topup-requests?status=${statusFilter}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error('[AdminTopupDesk] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject', reason?: string) => {
    setProcessingId(requestId);
    try {
      const res = await fetch('/api/admin/topup-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // The reviewer is taken from the admin's session on the server.
        body: JSON.stringify({ requestId, action, reason }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
      }
    } catch (err) {
      console.error('[AdminTopupDesk] Action error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.venue_name || '').toLowerCase().includes(q) ||
      r.utr_number.toLowerCase().includes(q) ||
      r.venue_id.toLowerCase().includes(q)
    );
  });

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
  };
}
