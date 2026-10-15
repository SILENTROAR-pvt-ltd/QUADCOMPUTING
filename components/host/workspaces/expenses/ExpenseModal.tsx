'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  children: React.ReactNode;
}

// 16px on a phone so iOS does not zoom into a field; the smaller size from `sm` up.
export const field = 'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[16px] text-neutral-950 outline-none focus:border-neutral-900 sm:text-sm';
export const label = 'mb-1 block text-[11px] font-semibold text-neutral-600';

/** The frame every staff and bill form uses: title, fields, error, and one clear action. A sheet on a phone, a card on a desk. */
export function ExpenseModal({ title, subtitle, onClose, onSubmit, submitLabel, busy, error, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-neutral-950/40 animate-in fade-in duration-200 sm:items-center sm:p-3" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-neutral-200 bg-white shadow-2xl animate-in slide-in-from-bottom-6 duration-200 sm:max-h-[92dvh] sm:rounded-3xl sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="font-serif text-2xl text-neutral-950">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-neutral-100 text-neutral-600 active:scale-95"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        <footer className="space-y-2 border-t border-neutral-200 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-12 rounded-2xl px-4 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer sm:h-10 sm:rounded-xl">Cancel</button>
            <button type="submit" disabled={busy} className="h-12 flex-1 rounded-2xl bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer active:scale-[0.99] sm:h-10 sm:flex-none sm:rounded-xl">{busy ? 'Saving…' : submitLabel}</button>
          </div>
        </footer>
      </form>
    </div>
  );
}
