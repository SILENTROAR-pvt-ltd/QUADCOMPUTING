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

export const field = 'h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-neutral-900';
export const label = 'mb-1 block text-[11px] font-semibold text-neutral-600';

/** The frame every staff and bill form uses: title, fields, error, and one clear action. */
export function ExpenseModal({ title, subtitle, onClose, onSubmit, submitLabel, busy, error, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/30 p-3 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="font-serif text-2xl text-neutral-950">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 cursor-pointer"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">{children}</div>
        <footer className="space-y-2 border-t border-neutral-200 px-5 py-4">
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer">Cancel</button>
            <button type="submit" disabled={busy} className="h-10 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer">{busy ? 'Saving…' : submitLabel}</button>
          </div>
        </footer>
      </form>
    </div>
  );
}
