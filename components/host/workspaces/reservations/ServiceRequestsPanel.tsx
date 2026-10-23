'use client';

import React, { useEffect, useState } from 'react';
import { BellRing, Check, Sparkles } from 'lucide-react';
import { useServiceRequests } from './useServiceRequests';
import type { ServiceRequest } from '@/lib/services/reservations/service-requests.service';

function timeAgo(iso: string, now: number) {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** "Bicycle Rental (₹250)" → the service and its price, so the row reads like a booking. */
function parse(message: string | null) {
  const m = String(message || '').match(/^(.*?)\s*\(₹\s*([\d,.]+)\)\s*$/);
  return m ? { name: m[1], price: `₹${m[2]}` } : { name: message || 'A venue service', price: null };
}

/**
 * Venue services guests asked for from the menu, waiting ones first. Each request also rings the bell (again every minute
 * until someone marks it done), and Done here clears it from the bell tray as well.
 */
export function ServiceRequestsPanel({ venueId }: { venueId: string }) {
  const { items, loading, error, busyId, done } = useServiceRequests(venueId);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {loading ? <div className="shimmer m-4 h-24 rounded-xl" /> : items.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-neutral-500">No service requests in the last two days. When a guest asks for one of your services from the menu, it appears here and the bell rings.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {items.map((r) => <ServiceRequestRow key={r.id} request={r} now={now} busy={busyId === r.id} onDone={() => void done(r.id)} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function ServiceRequestRow({ request, now, busy, onDone }: { request: ServiceRequest; now: number; busy: boolean; onDone: () => void }) {
  const waiting = request.status === 'PENDING';
  const { name, price } = parse(request.message);
  return (
    <li className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${waiting ? 'bg-violet-50/50' : ''}`}>
      <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${waiting ? 'border-violet-200 bg-violet-100 text-violet-700' : 'border-neutral-200 bg-neutral-50 text-neutral-400'}`}>
        {waiting ? <BellRing className="h-4 w-4 animate-pulse" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-neutral-950">{name}</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {request.table_number ? `Table ${request.table_number}` : 'A guest'}{price && <> · <span className="font-semibold text-neutral-700">{price}</span></>} · {timeAgo(request.created_at, now)}
          {waiting ? <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800">Waiting</span> : <span className="ml-1.5 text-emerald-700">Handled</span>}
        </p>
      </div>
      {waiting && (
        <button type="button" onClick={onDone} disabled={busy}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-950 px-3.5 text-[12.5px] font-semibold text-white hover:bg-neutral-800 active:scale-95 disabled:opacity-50">
          <Check className="h-3.5 w-3.5" aria-hidden /> {busy ? 'Saving…' : 'Done'}
        </button>
      )}
    </li>
  );
}
