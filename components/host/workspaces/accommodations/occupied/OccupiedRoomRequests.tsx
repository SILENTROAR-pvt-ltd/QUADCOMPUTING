'use client';

import React from 'react';
import { Check, ConciergeBell, MessageSquareText, Receipt, Sparkles } from 'lucide-react';
import type { RoomRequestItem, RoomRequestKind } from '@/lib/services/stay/room-requests.service';
import { useOccupiedRoomRequests } from './useOccupiedRoomRequests';

const ICON: Record<RoomRequestKind, React.FC<{ className?: string }>> = { service: Sparkles, waiter: ConciergeBell, bill: Receipt, other: MessageSquareText };
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function Row({ r, busy, onDone }: { r: RoomRequestItem; busy: boolean; onDone: () => void }) {
  const Icon = ICON[r.kind];
  const waiting = r.status === 'waiting';
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${waiting ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500'}`}><Icon className="h-4 w-4" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className={`break-words text-sm ${waiting ? 'font-semibold text-neutral-950' : 'text-neutral-700'}`}>{r.message || 'Request from the room'}</p>
        <p className="mt-0.5 text-[11px] text-neutral-500">{when(r.at)}</p>
      </div>
      {waiting ? (
        <button type="button" onClick={onDone} disabled={busy} className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">
          <Check className="h-3 w-3" /> Mark done
        </button>
      ) : (
        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">Done</span>
      )}
    </li>
  );
}

/**
 * The folio's request history: everything the guest asked the desk for this stay (housekeeping, towels, water, a call,
 * their own notes, check-out or payment), the open ones first in bold with "Mark done", the handled ones below. Marking
 * one done also tells the guest's room page at once.
 */
export function OccupiedRoomRequests({ roomId }: { roomId: string }) {
  const { requests, busyId, markDone } = useOccupiedRoomRequests(roomId);
  return <OccupiedRoomRequestsView requests={requests} busyId={busyId} onDone={(id) => void markDone(id)} />;
}

/** The list itself: open requests first, then the handled ones; null while the first read is on its way. */
export function OccupiedRoomRequestsView({ requests, busyId = null, onDone = () => {} }: { requests: RoomRequestItem[] | null; busyId?: string | null; onDone?: (id: string) => void }) {
  const waiting = (requests || []).filter((r) => r.status === 'waiting');
  const done = (requests || []).filter((r) => r.status === 'done');
  return (
    <section aria-label="Guest requests this stay" className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-950">Guest requests this stay{requests ? ` (${requests.length})` : ''}</h3>
        {waiting.length > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">{waiting.length} waiting</span>}
      </header>
      {requests === null ? (
        <div className="h-16 animate-pulse bg-neutral-50" aria-busy="true" />
      ) : requests.length === 0 ? (
        <p className="px-4 py-4 text-xs text-neutral-500">Nothing asked yet. Housekeeping, towels, water, calls and notes sent from the room page show here.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-neutral-100 overflow-y-auto">
          {[...waiting, ...done].map((r) => <Row key={r.id} r={r} busy={busyId === r.id} onDone={() => onDone(r.id)} />)}
        </ul>
      )}
    </section>
  );
}
