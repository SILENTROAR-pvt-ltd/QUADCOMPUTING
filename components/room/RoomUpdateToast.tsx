'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BellRing, CheckCircle2, X } from 'lucide-react';
import type { RoomState } from './useRoomStay';
import { roomUpdates, type RoomUpdate } from './room-updates';

const SHOW_MS = 7000;

/**
 * The desk's answers, as they happen: when a re-read of the room shows a request done, a late check-out decided or a
 * payment recorded, a short alert slides in at the top of the page (and the phone buzzes once where it can).
 */
export function RoomUpdateToast({ data }: { data: RoomState | null }) {
  const previous = useRef<RoomState | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const [queue, setQueue] = useState<RoomUpdate[]>([]);

  useEffect(() => {
    const fresh = roomUpdates(previous.current, data).filter((u) => !seen.current.has(u.id));
    previous.current = data;
    if (!fresh.length) return;
    fresh.forEach((u) => seen.current.add(u.id));
    setQueue((q) => [...q, ...fresh]);
    try { navigator.vibrate?.(60); } catch { /* optional */ }
  }, [data]);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), SHOW_MS);
    return () => clearTimeout(t);
  }, [current]);

  if (!current) return null;
  const Icon = current.tone === 'good' ? CheckCircle2 : BellRing;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-3 top-3 z-[120] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-xl shadow-emerald-950/10 animate-in slide-in-from-top-2 fade-in duration-200">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${current.tone === 'good' ? 'bg-emerald-600 text-white' : 'bg-neutral-900 text-white'}`}><Icon className="h-4 w-4" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-950">{current.title}</p>
        <p className="mt-0.5 break-words text-[13px] leading-snug text-neutral-600">{current.body}</p>
      </div>
      <button type="button" onClick={() => setQueue((q) => q.slice(1))} aria-label="Dismiss" className="-mr-1 grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-neutral-500 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
    </div>
  );
}
