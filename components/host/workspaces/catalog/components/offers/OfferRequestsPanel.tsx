'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, MessageCircle, Ticket, X } from 'lucide-react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import type { OfferRequestView } from '@/lib/services/offers/offer-requests';

const REFRESH_MS = 20_000;

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} h ago`;
}

/** Guest redemptions and questions about live offers. A redemption is settled at the counter, then marked here. */
export function OfferRequestsPanel() {
  const [requests, setRequests] = useState<OfferRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await apiRequest<{ requests: OfferRequestView[] }>('/api/venue/requests', { cache: 'no-store' });
    if (result.ok && result.data) {
      setRequests(result.data.requests);
      setError(null);
    } else if (!result.ok) {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const act = async (id: string, status: 'settled' | 'closed') => {
    setBusyId(id);
    setError(null);
    const result = await apiRequest('/api/venue/requests', jsonRequest('PATCH', { id, status }));
    setBusyId(null);
    if (result.ok) setRequests((prev) => prev.filter((r) => r.id !== id));
    else setError(result.error);
  };

  return (
    <section aria-label="Guest requests" className="rounded-2xl border border-neutral-200/90 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base font-medium text-neutral-900">Guest Requests</h3>
        <span className="text-[11px] text-neutral-500">{requests.length} open</span>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-neutral-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading requests…</p>
      ) : requests.length === 0 ? (
        <p className="text-xs text-neutral-500">No open redemptions or questions. New ones appear here and in the alert feed.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${r.kind === 'redeem' ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-700'}`}>
                {r.kind === 'redeem' ? <Ticket className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {r.kind === 'redeem' ? <span className="font-mono tracking-widest">{r.code}</span> : 'Question'} · {r.offer_title}
                </p>
                <p className="text-[11px] text-neutral-500 truncate">
                  {r.table_number ? `Table ${r.table_number} · ` : ''}{r.guest_name || 'Guest'} · {ago(r.created_at)}
                </p>
                {r.message && <p className="mt-1 text-xs text-neutral-700">{r.message}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {r.kind === 'redeem' && (
                  <button
                    type="button"
                    onClick={() => act(r.id, 'settled')}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-1 rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" /> Settle
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => act(r.id, 'closed')}
                  disabled={busyId === r.id}
                  className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 disabled:opacity-50 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" /> {r.kind === 'redeem' ? 'Cancel' : 'Done'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default OfferRequestsPanel;
