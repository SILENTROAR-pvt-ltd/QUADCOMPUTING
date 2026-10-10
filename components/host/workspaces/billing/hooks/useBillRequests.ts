import { useState, useEffect, useCallback } from 'react';
import type { BillRequestEvent } from '../BillRequestsModal';
import { usePoll } from '@/lib/utils/use-poll';

const POLL_MS = 6000;

export function useBillRequests() {
  const [requests, setRequests] = useState<BillRequestEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/host/sessions?view=bill_requests', { cache: 'no-store' });
      if (!response.ok) throw new Error('Bill request history is unavailable.');
      const data = await response.json();
      setRequests(Array.isArray(data.requests) ? data.requests : []);
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
