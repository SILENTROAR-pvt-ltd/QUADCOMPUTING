'use client';

import React, { useEffect } from 'react';
import { BedDouble, Printer, Receipt, X } from 'lucide-react';
import type { HistoricalStayRecord } from '@/types';
import { useStayDetail } from './useStayDetail';
import { StayDetailGuest } from './StayDetailGuest';
import { StayDetailBill } from './StayDetailBill';
import { StayDetailOrders } from './StayDetailOrders';
import { dayShort, inr } from './stay-format';

interface Props { stay: HistoricalStayRecord; onClose: () => void; onOpenInvoice: (stay: HistoricalStayRecord) => void }

/**
 * One past stay, in full: the guest as registered, their ID, the dates, the invoice with every line and payment, the
 * food ordered to the room, and the cashback credited. A sheet from the bottom on a phone, a card on a desk.
 */
export function StayDetailSheet({ stay, onClose, onOpenInvoice }: Props) {
  const { detail, loading, error } = useStayDetail(stay.id);
  const room = stay.room_number || stay.room?.room_number || 'Room';
  const category = stay.category_name || stay.room?.category?.name || '';
  const settled = Boolean(stay.check_out_time);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/35 backdrop-blur-sm animate-in fade-in duration-150 sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Stay of ${stay.guest_name}`} onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-neutral-50 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:max-h-[90vh] sm:rounded-3xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neutral-100 text-neutral-700"><BedDouble className="h-5 w-5" aria-hidden /></span>
            <div className="min-w-0">
              <h2 className="truncate font-serif text-xl text-neutral-950 sm:text-2xl">{stay.guest_name || 'Guest'}</h2>
              <p className="truncate text-xs text-neutral-500">
                Room <span className="font-mono font-semibold text-neutral-800">{room}</span>{category ? ` · ${category}` : ''} · {dayShort(stay.check_in_time)} → {settled ? dayShort(stay.check_out_time) : 'in house'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset sm:inline ${settled ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-sky-50 text-sky-800 ring-sky-200'}`}>{settled ? 'Settled' : 'In house'}</span>
            <span className="font-mono text-base font-bold text-neutral-950">{inr(stay.total_billed_amount)}</span>
            <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <StayDetailGuest stay={stay} />
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{error}</p>}
          {loading && <div className="space-y-3" aria-busy="true"><div className="h-40 animate-pulse rounded-2xl bg-neutral-200/60" /><div className="h-24 animate-pulse rounded-2xl bg-neutral-200/60" /></div>}
          {detail && <><StayDetailBill detail={detail} /><StayDetailOrders orders={detail.orders} /></>}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-neutral-200 bg-white px-4 py-3 sm:px-6">
          <button type="button" onClick={() => window.print()} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"><Printer className="h-4 w-4" aria-hidden /> Print</button>
          <button type="button" onClick={() => onOpenInvoice(stay)} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-neutral-950 px-4 text-xs font-semibold text-white hover:bg-neutral-800"><Receipt className="h-4 w-4" aria-hidden /> Invoice &amp; folio</button>
        </footer>
      </div>
    </div>
  );
}
