'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import type { BillLine } from './LiveTableLine';
import type { TableSessionFacts, TableOrderFacts } from '@/lib/utils/table-guest';

interface BillResponse {
  items: BillLine[];
  order: (TableOrderFacts & { id?: string; subtotal?: number; tax_amount?: number; grand_total?: number }) | null;
  session: (TableSessionFacts & { id?: string; status?: string }) | null;
}

/** A table's live bill and session, with changing and removing lines the kitchen has not started. */
export function useTableBill(venueId: string, tableNumber: string, onChanged: () => void) {
  const [lines, setLines] = useState<BillLine[]>([]);
  const [order, setOrder] = useState<BillResponse['order']>(null);
  const [session, setSession] = useState<BillResponse['session']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyLine, setBusyLine] = useState<string | null>(null);

  const load = useCallback(async () => {
    // A fresh key on every read: the sessions endpoint replays identical requests for a short window,
    // which would show a changed line as it was.
    const result = await apiRequest<BillResponse>('/api/host/sessions', jsonRequest('POST', {
      table_number: tableNumber,
      business_id: venueId,
      idempotency_key: `bill-${tableNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }));
    if (result.ok && result.data) {
      const items = Array.isArray(result.data.items) ? result.data.items : [];
      setLines(items.filter((l) => String(l.kot_status ?? '').toLowerCase() !== 'cancelled'));
      setOrder(result.data.order ?? null);
      setSession(result.data.session ?? null);
      setError(null);
    } else if (!result.ok) {
      setError(result.error);
    }
    setLoading(false);
  }, [tableNumber, venueId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const changeLine = async (line: BillLine, quantity: number) => {
    setBusyLine(line.id);
    setError(null);
    const result = quantity <= 0
      ? await apiRequest('/api/host/tables/lines', jsonRequest('POST', { order_item_id: line.id }))
      : await apiRequest('/api/host/tables/lines', jsonRequest('PATCH', { order_item_id: line.id, quantity }));
    setBusyLine(null);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    await load();
    onChanged();
    return true;
  };

  return { lines, order, session, loading, error, busyLine, reload: load, changeLine, setError };
}
