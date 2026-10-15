'use client';

import React, { useMemo, useState } from 'react';
import { BellRing, Loader2, Plus, X } from 'lucide-react';
import type { TableVisualState } from '@/lib/utils/live-table-state';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { kitchenSummary, ticketsForTable } from '@/lib/utils/table-kitchen';
import { LiveTableKitchen } from './LiveTableKitchen';
import { TABLE_STATE_STYLE } from './live-table-style';
import { LiveTableLine, type BillLine } from './LiveTableLine';
import { LiveTableFooter } from './LiveTableFooter';
import { LiveTableGuest } from './LiveTableGuest';
import { LiveTableAddItems } from './LiveTableAddItems';
import { useTableBill } from './useTableBill';
import { useTableActions } from './useTableActions';

interface LiveTableControlPanelProps {
  venueId: string;
  tableNumber: string;
  state: TableVisualState;
  /** Every kitchen ticket of the venue, live; the panel shows this table's. */
  kitchenTickets: KitchenTicket[];
  kitchenLoading: boolean;
  /** Marks a ticket served; resolves false when it could not be saved. */
  onServeTicket: (ticketId: string) => Promise<boolean>;
  /** A line or an item changed: the board's tables refresh. */
  onChanged: () => void;
  /** An unstarted table was freed: the board updates at once and the panel closes. */
  onFinished: (kind: 'release') => void;
  onOpenBilling: () => void;
  onClose: () => void;
}

const OCCUPIED: TableVisualState[] = ['live', 'occupied', 'bill_requested'];

/** The selected table: who is there, its bill and kitchen, adding items, and sending the bill to billing (or freeing an unstarted table). */
export function LiveTableControlPanel({ venueId, tableNumber, state, kitchenTickets, kitchenLoading, onServeTicket, onChanged, onFinished, onOpenBilling, onClose }: LiveTableControlPanelProps) {
  const [view, setView] = useState<'bill' | 'kitchen' | 'add'>('bill');
  const [confirming, setConfirming] = useState<string | null>(null);
  const bill = useTableBill(venueId, tableNumber, onChanged);
  const style = TABLE_STATE_STYLE[state];
  const kitchen = useMemo(
    () => kitchenSummary(ticketsForTable(kitchenTickets, tableNumber, bill.order?.id ?? null)),
    [kitchenTickets, tableNumber, bill.order?.id],
  );

  const subtotal = bill.order?.subtotal ?? bill.lines.reduce((sum, l) => sum + Number(l.price) * Number(l.quantity), 0);
  const tax = bill.order?.tax_amount ?? 0;
  const total = bill.order?.grand_total ?? subtotal + tax;
  const hasBill = bill.lines.length > 0;
  const showGuest = OCCUPIED.includes(state);

  const actions = useTableActions(
    venueId,
    tableNumber,
    { subtotal, tax, total, orderId: bill.order?.id ?? null },
    // Sending the bill to billing leaves the table where it is (it now shows "Bill requested"); only a freed table closes.
    (kind) => { if (kind === 'release') onFinished('release'); else onChanged(); },
  );

  const removeLine = async (line: BillLine) => {
    setConfirming(null);
    await bill.changeLine(line, 0);
  };

  return (
    <aside aria-label={`Table ${tableNumber} control`} className="flex h-full min-h-0 flex-col overflow-hidden rounded-t-[28px] border border-neutral-200 bg-white shadow-sm lg:max-h-[calc(100dvh-3rem)] lg:rounded-3xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="font-serif text-2xl leading-none text-neutral-950">{tableNumber}</h2>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} /> {style.label}
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close table panel" className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-neutral-100 text-neutral-700 active:scale-95 lg:hidden">
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* The guest and the Bill / Add items switch stay put; only the bill below them scrolls. */}
      <div className="shrink-0 space-y-2 px-4 pt-3 sm:px-5">
        {showGuest && <LiveTableGuest session={bill.session} order={bill.order} />}

        {kitchen.readyDishes > 0 && view !== 'kitchen' && (
          <button type="button" onClick={() => setView('kitchen')}
            className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-emerald-600 px-3 text-left text-[13px] font-semibold text-white active:bg-emerald-700">
            <span className="flex items-center gap-2"><BellRing className="h-4 w-4 shrink-0 animate-pulse" aria-hidden /> {kitchen.readyDishes} ready to serve</span>
            <span className="text-[12px] font-medium text-emerald-50">View</span>
          </button>
        )}

        <div role="tablist" aria-label="Table view" className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1">
          {(['bill', 'kitchen', 'add'] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-lg px-1 text-[13px] font-semibold cursor-pointer ${view === v ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}>
              {v === 'kitchen' && kitchen.readyDishes > 0 && view !== 'kitchen' && <span aria-hidden className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />}
              {v === 'bill' ? `Bill · ${bill.lines.length}` : v === 'kitchen' ? `Kitchen · ${kitchen.openTickets}` : 'Add items'}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-3 pt-2 sm:px-5">
        {bill.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{bill.error}</p>}

        {view === 'add' ? (
          <LiveTableAddItems venueId={venueId} tableNumber={tableNumber} onAdded={() => { void bill.reload(); onChanged(); setView('bill'); }} />
        ) : view === 'kitchen' ? (
          <LiveTableKitchen
            tickets={kitchenTickets}
            tableNumber={tableNumber}
            orderId={bill.order?.id ?? null}
            loading={kitchenLoading}
            onServe={onServeTicket}
          />
        ) : bill.loading ? (
          <p className="flex items-center gap-2 text-xs text-neutral-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the bill…</p>
        ) : !hasBill ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-neutral-300 px-4 py-8 text-center text-xs text-neutral-500">
            <p>{showGuest ? 'No items on this table yet.' : 'This table is free. Add items to seat a party.'}</p>
            <button type="button" onClick={() => setView('add')} className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-950 px-4 text-[13px] font-semibold text-white">
              <Plus className="h-3.5 w-3.5" /> Add items
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {bill.lines.map((line) => (
              <LiveTableLine
                key={line.id}
                line={line}
                confirming={confirming === line.id}
                removing={bill.busyLine === line.id}
                onAskRemove={() => setConfirming(line.id)}
                onConfirmRemove={() => void removeLine(line)}
                onKeep={() => setConfirming(null)}
                onQuantity={(q) => void bill.changeLine(line, q)}
              />
            ))}
          </ul>
        )}
      </div>

      <LiveTableFooter
        subtotal={subtotal}
        tax={tax}
        total={total}
        hasBill={hasBill}
        tableNumber={tableNumber}
        busy={actions.busy}
        locked={bill.syncing || !bill.fresh}
        billRequested={state === 'bill_requested' || actions.requested}
        error={actions.error}
        onSendToBilling={() => void actions.sendToBilling()}
        onRelease={() => void actions.release()}
        onOpenBilling={onOpenBilling}
      />
    </aside>
  );
}

export default LiveTableControlPanel;
