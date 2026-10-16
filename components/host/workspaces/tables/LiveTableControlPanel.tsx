'use client';

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { TableVisualState } from '@/lib/utils/live-table-state';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { kitchenSummary, ticketsForTable } from '@/lib/utils/table-kitchen';
import { LiveTableKitchen } from './LiveTableKitchen';
import { TABLE_STATE_STYLE } from './live-table-style';
import { LiveTableFooter } from './LiveTableFooter';
import { LiveTableGuest } from './LiveTableGuest';
import { LiveTableAddItems } from './LiveTableAddItems';
import { LiveTableTabs, type TableView } from './LiveTableTabs';
import { LiveTableBillList } from './LiveTableBillList';
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
  /** A table was settled or freed: the board updates at once and the panel closes. */
  onFinished: (kind: 'release' | 'settle') => void;
  onOpenBilling: () => void;
  onClose: () => void;
  /** The owner lets waiters settle bills from here. */
  canSettle: boolean;
}

const OCCUPIED: TableVisualState[] = ['live', 'occupied', 'bill_requested'];

/** The selected table: who is there, its bill and kitchen, adding items, and settling or sending the bill to billing. */
export function LiveTableControlPanel({ venueId, tableNumber, state, kitchenTickets, kitchenLoading, onServeTicket, onChanged, onFinished, onOpenBilling, onClose, canSettle }: LiveTableControlPanelProps) {
  const [view, setView] = useState<TableView>('bill');
  const bill = useTableBill(venueId, tableNumber, onChanged);
  const style = TABLE_STATE_STYLE[state];
  const kitchen = useMemo(
    () => kitchenSummary(ticketsForTable(kitchenTickets, tableNumber, bill.order?.id ?? null)),
    [kitchenTickets, tableNumber, bill.order?.id],
  );

  const subtotal = bill.order?.subtotal ?? bill.lines.reduce((sum, l) => sum + Number(l.price) * Number(l.quantity), 0);
  const tax = bill.order?.tax_amount ?? 0;
  const total = bill.order?.grand_total ?? subtotal + tax;
  const showGuest = OCCUPIED.includes(state);
  const adding = view === 'add';

  const actions = useTableActions(
    venueId, tableNumber, { subtotal, tax, total, orderId: bill.order?.id ?? null },
    (kind) => { if (kind === 'release' || kind === 'settle') onFinished(kind); else onChanged(); },
  );

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

      {/* The guest and the view switch stay put; only the content below scrolls. Adding items hides the guest to give the menu the room. */}
      <div className="shrink-0 space-y-2 px-4 pt-3 sm:px-5">
        {showGuest && !adding && <LiveTableGuest session={bill.session} order={bill.order} />}
        <LiveTableTabs view={view} onView={setView} billLines={bill.lines.length} openTickets={kitchen.openTickets} readyDishes={kitchen.readyDishes} />
      </div>

      <div className={`min-h-0 flex-1 px-4 pt-2 sm:px-5 ${adding ? 'flex flex-col pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]' : 'space-y-3 overflow-y-auto overscroll-contain pb-3'}`}>
        {bill.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{bill.error}</p>}
        {adding ? (
          <LiveTableAddItems venueId={venueId} onSubmit={bill.addItems} />
        ) : view === 'kitchen' ? (
          <LiveTableKitchen tickets={kitchenTickets} tableNumber={tableNumber} orderId={bill.order?.id ?? null} loading={kitchenLoading} onServe={onServeTicket} />
        ) : (
          <LiveTableBillList lines={bill.lines} loading={bill.loading} occupied={showGuest} busyLine={bill.busyLine} onChangeLine={bill.changeLine} onAdd={() => setView('add')} />
        )}
      </div>

      {!adding && (
        <LiveTableFooter
          subtotal={subtotal} tax={tax} total={total} hasBill={bill.lines.length > 0} tableNumber={tableNumber}
          busy={actions.busy} locked={bill.syncing || !bill.fresh} billRequested={state === 'bill_requested' || actions.requested}
          error={actions.error} canSettle={canSettle} onSettle={(t) => void actions.settle(t)} onSendToBilling={() => void actions.sendToBilling()}
          onRelease={() => void actions.release()} onOpenBilling={onOpenBilling}
        />
      )}
    </aside>
  );
}

export default LiveTableControlPanel;
