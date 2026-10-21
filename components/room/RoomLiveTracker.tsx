'use client';

import React from 'react';
import { RefreshCw, Wifi } from 'lucide-react';
import { TrackerTimeline } from '@/components/guest/menu/TrackerTimeline';
import { TrackerStatusCallout } from '@/components/guest/menu/TrackerStatusCallout';
import { resolveTrackerStage, stageCopy, stageStep } from '@/components/guest/menu/tracker/tracker-copy';
import { inr } from '@/components/stay/stay-format';
import type { RoomState } from './useRoomStay';

type Order = NonNullable<RoomState['folio']>['orders'][number];
const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/** The newest order the kitchen is still working on: served or cancelled ones have nothing left to track. */
export function trackedOrder(orders: Order[]): Order | null {
  return orders.find((o) => {
    const stage = resolveTrackerStage(o.kot_status || '', o.status);
    return stage !== 'served' && !['CANCELLED', 'REJECTED', 'VOID'].includes(String(o.status).toUpperCase());
  }) || null;
}

interface Props { order: Order; roomNumber: string; live: boolean; onRefresh: () => void }

/**
 * The menu's order tracker, in the room: the same three steps (received, being prepared, on its way), the same wording,
 * moved along by the same kitchen pushes. The guest sees the dish move without touching the page.
 */
export function RoomLiveTracker({ order, roomNumber, live, onRefresh }: Props) {
  const stage = resolveTrackerStage(order.kot_status || '', order.status);
  const copy = stageCopy(stage, `RS-${roomNumber}`);
  const items = order.items.map((i) => ({ name: i.name, quantity: i.qty }));
  return (
    <section id="live-order-tracker" data-kot-step={stageStep(stage)} aria-label="Live order tracker" aria-live="polite"
      className="overflow-hidden rounded-[1.75rem] border border-[#e6d9b8]/80 bg-[#fcfaf4] shadow-[0_24px_60px_-28px_rgba(10,50,34,0.45)]">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8a6d2b]">{copy.eyebrow}{order.ticket_number ? ` · ${order.ticket_number}` : ''}</p>
          <h2 className="mt-1.5 text-2xl font-medium leading-tight text-neutral-950 [text-wrap:balance]" style={serif}>{copy.headline}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{copy.detail.replace('your table', `Room ${roomNumber}`)}</p>
        </div>
        <button type="button" onClick={onRefresh} aria-label="Refresh" title={live ? 'Live: updates arrive on their own' : 'Refresh'}
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-[#e6d9b8] bg-white text-neutral-600 hover:text-neutral-950">
          {live ? <Wifi className="h-4 w-4 text-emerald-700" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      <div className="px-5 pb-5 pt-5 sm:px-7 sm:pb-6">
        <TrackerTimeline currentStep={stageStep(stage)} kotNumber={order.ticket_number} status={order.kot_status || order.status} stage={stage} />
        <TrackerStatusCallout items={items} />
        <p className="mt-4 flex items-center justify-between text-xs text-neutral-500">
          <span>{live ? <><span aria-hidden className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live from the kitchen</> : 'Checking with the kitchen every few seconds'}</span>
          <span className="font-mono text-neutral-800">{inr(order.grand_total)} · on your room bill</span>
        </p>
      </div>
    </section>
  );
}
