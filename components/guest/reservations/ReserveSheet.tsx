'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { useReserveForm } from './useReserveForm';
import { DatePicker, SlotPicker, PartyStepper, TablePicker, fmt12, dayLabel } from './ReserveFields';

interface Props {
  venueId: string;
  venueName: string;
  initialName: string;
  initialPhone: string;
  onClose: () => void;
}

const field = 'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-[16px] text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-900';

/** Book a table: a date, a time inside opening hours, a party size, and a table (or any that fits). */
export function ReserveSheet({ venueId, venueName, initialName, initialPhone, onClose }: Props) {
  const f = useReserveForm({ venueId, initialName, initialPhone });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const canSend = !f.validation && f.canTableFit && !f.submitting;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="reserve-title">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs cursor-pointer" />
      <div className="relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl bg-[#faf9f6] shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom-6 duration-300">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200/80 px-5 py-4">
          <div>
            <h2 id="reserve-title" className="font-serif text-xl text-neutral-950">Reserve a table</h2>
            <p className="mt-0.5 text-xs text-neutral-500">{venueName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 cursor-pointer"><X className="h-4 w-4" /></button>
        </header>

        {f.booked ? (
          <div className="space-y-3 px-5 py-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="font-serif text-lg text-neutral-950">Request sent</p>
            <p className="text-sm text-neutral-600">
              {f.booked.table ? `Table ${f.booked.table}` : 'A table'} for {fmt12(f.booked.time)}, {dayLabel(f.booked.date, f.dates[0])}.
              The venue confirms your booking shortly.
            </p>
            <button type="button" onClick={onClose} className="mt-2 h-11 cursor-pointer rounded-xl bg-neutral-950 px-6 text-sm font-semibold text-white">Done</button>
          </div>
        ) : (
          <form className="flex-1 space-y-5 overflow-y-auto px-5 py-5" onSubmit={(e) => { e.preventDefault(); if (canSend) void f.submit(); }} noValidate>
            <section className="space-y-2">
              <p className="text-xs font-semibold text-neutral-700">Date</p>
              <DatePicker dates={f.dates} value={f.date} onChange={f.setDate} />
            </section>

            <section className="space-y-2">
              <p className="text-xs font-semibold text-neutral-700">Time</p>
              <SlotPicker slots={f.slots} value={f.time} onChange={f.setTime} />
            </section>

            <section className="space-y-2">
              <p className="text-xs font-semibold text-neutral-700">Party size</p>
              <PartyStepper value={f.partySize} onChange={f.setPartySize} />
            </section>

            <section className="space-y-2">
              <p className="text-xs font-semibold text-neutral-700">Table</p>
              {f.time ? (
                <TablePicker tables={f.tables} partySize={f.partySize} value={f.tableId} onChange={f.setTableId} anyFits={f.enoughTables} />
              ) : (
                <p className="text-sm text-neutral-500">Pick a time to see free tables.</p>
              )}
            </section>

            <section className="grid gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-neutral-700">Name</span>
                <input value={f.name} onChange={(e) => f.setName(e.target.value)} maxLength={60} autoComplete="name" className={field} placeholder="Your name" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-neutral-700">Phone</span>
                <input value={f.phone} onChange={(e) => f.setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" className={field} placeholder="98765 43210" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-neutral-700">Note (optional)</span>
                <input value={f.notes} onChange={(e) => f.setNotes(e.target.value)} maxLength={300} className={field} placeholder="Birthday, window seat, high chair…" />
              </label>
            </section>

            {f.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{f.error}</p>}
          </form>
        )}

        {!f.booked && (
          <footer className="border-t border-neutral-200/80 px-5 py-4">
            <button type="button" disabled={!canSend} onClick={() => void f.submit()}
              className="h-12 w-full cursor-pointer rounded-xl bg-neutral-950 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40">
              {f.submitting ? 'Sending…' : f.validation ?? 'Request this table'}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
