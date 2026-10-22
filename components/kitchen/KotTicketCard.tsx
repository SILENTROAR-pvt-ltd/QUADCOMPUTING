'use client';

import React, { useState } from 'react';
import { BellRing, CheckCircle2, Flame, Loader2, UtensilsCrossed, Wine, XCircle } from 'lucide-react';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { kotTimeline } from '@/lib/utils/kot-timeline';
import { splitPlace } from '@/lib/utils/kot-notes';
import type { KitchenStation } from './kitchen-station';
import { KOT_STATUS, URGENCY_PILL, clockTime } from './kot-status-style';
import { KotItems } from './KotItems';
import { KotTimelineRow } from './KotTimelineRow';

interface KotTicketCardProps {
  ticket: KitchenTicket;
  station: KitchenStation;
  nowMs: number;
  onStatus: (to: KitchenTicket['status']) => Promise<boolean>;
  onToggleItem: (idx: number) => Promise<boolean>;
}

const STATION_ICON: Record<KitchenStation, React.ReactNode> = {
  Kitchen: <UtensilsCrossed className="h-3 w-3" />,
  Bar: <Wine className="h-3 w-3" />,
  Grill: <Flame className="h-3 w-3" />,
};

/** One kitchen ticket: where it goes, every dish with its add-ons and notes, its timeline, and the next step. */
export function KotTicketCard({ ticket, station, nowMs, onStatus, onToggleItem }: KotTicketCardProps) {
  const [busy, setBusy] = useState(false);
  const style = KOT_STATUS[ticket.status] ?? KOT_STATUS.PENDING;
  const timeline = kotTimeline(ticket, nowMs);
  const { place, addon } = splitPlace(ticket.table_or_room);
  // The board cleans tickets before they get here; this keeps one odd ticket from taking the whole screen down.
  const items = Array.isArray(ticket.items) ? ticket.items : [];
  const qtyTotal = items.reduce((sum, it) => sum + (Number(it.qty || (it as any).quantity) || 1), 0);
  const doneCount = items.filter((it) => it.completed).length;

  const advance = async () => {
    if (!style.next) return;
    setBusy(true);
    try {
      await onStatus(style.next.to);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      aria-label={`Ticket ${ticket.ticket_number}, ${place}, ${style.label}`}
      className="flex min-h-[20rem] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    >
      <div className={`h-1.5 ${style.band}`} />
      <header className="flex items-start justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-serif text-2xl leading-none text-neutral-950">{place}</h3>
            {addon && <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800">Add-on</span>}
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
            <span className="font-mono font-semibold text-neutral-700">#{ticket.ticket_number}</span>
            <span className="flex items-center gap-1">{STATION_ICON[station]} {station}</span>
            <span className={`rounded-full border px-2 py-0.5 font-semibold ${style.chip}`}>{style.label}</span>
          </p>
        </div>
        <div className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center ${URGENCY_PILL[timeline.urgency]}`}>
          <p className="font-mono text-lg font-bold leading-none">{timeline.stageMinutes}m</p>
          <p className="text-[9px] font-semibold uppercase tracking-wider opacity-80">{style.timerLabel}</p>
        </div>
      </header>

      <div className="flex-1 px-4 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          {items.length} {items.length === 1 ? 'dish' : 'dishes'} · {qtyTotal} qty{doneCount ? ` · ${doneCount} done` : ''}
        </p>
        <KotItems items={items} onToggle={(idx) => void onToggleItem(idx)} />
      </div>

      <div className="border-t border-neutral-100 px-4 py-3">
        <KotTimelineRow timeline={timeline} />
      </div>

      <div className="px-4 pb-4">
        {style.next ? (
          <button
            type="button"
            onClick={advance}
            disabled={busy}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50 cursor-pointer ${style.next.button}`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {style.next.label}
          </button>
        ) : style.waitingOn ? (
          // Ready: the kitchen's part is done. The waiter marks it served from Live Tables, so no button here.
          <p role="status" className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-2 text-center text-xs font-semibold leading-tight text-emerald-800">
            <BellRing className="h-4 w-4 shrink-0 animate-pulse" aria-hidden />
            Ready {clockTime(timeline.stages[2].at) ?? ''} · {style.waitingOn}
          </p>
        ) : ticket.status === 'CANCELLED' ? (
          <p className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-rose-50 text-xs font-semibold text-rose-800">
            <XCircle className="h-4 w-4" aria-hidden /> Cancelled
          </p>
        ) : (
          <p className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-neutral-50 text-xs font-semibold text-neutral-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Served {clockTime(timeline.stages[3].at) ?? ''} · {timeline.totalMinutes}m total
          </p>
        )}
      </div>
    </article>
  );
}

export default KotTicketCard;
