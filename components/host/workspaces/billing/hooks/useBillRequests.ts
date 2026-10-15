import { useState, useEffect, useCallback } from 'react';
import type { BillRequestEvent } from '../BillRequestsModal';
import { sharedGet } from '@/lib/utils/shared-get';
import { usePoll } from '@/lib/utils/use-poll';

const POLL_MS = 6000;

export function useBillRequests() {
  const [requests, setRequests] = useState<BillRequestEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      // Shared with the sidebar's bill-request poll, so one screen sends one request, not two.
      const response = await sharedGet<{ requests?: BillRequestEvent[] }>('/api/host/sessions?view=bill_requests');
      if (!response.ok) throw new Error('Bill request history is unavailable.');
      setRequests(Array.isArray(response.data?.requests) ? response.data.requests : []);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load history.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  usePoll(() => { void load(); }, POLL_MS);

  return { requests, isLoading, error };
}
