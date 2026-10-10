'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Printer, RefreshCw } from 'lucide-react';
import { ZReportDocument } from './eod/ZReportDocument';
import { shiftDay, useEodZReport } from './eod/useEodZReport';

interface EodZReportModalProps {
  onClose: () => void;
  venueId?: string;
}

// Printing shows only the report: everything else on the page is left out and the
// report flows across A4 pages instead of being clipped by the scrolling overlay.
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 12mm; }
  body > *:not(#z-report-root) { display: none !important; }
  #z-report-root { position: static !important; overflow: visible !important; height: auto !important; background: #fff !important; }
  #z-report-root .z-scroll { overflow: visible !important; padding: 0 !important; }
}`;

const iconBtn = 'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

/** Full-screen end-of-day Z-report for one business day, with day navigation and printing. */
export function EodZReportModal({ onClose, venueId }: EodZReportModalProps) {
  const z = useEodZReport(venueId);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div id="z-report-root" role="dialog" aria-modal="true" aria-label="End-of-day Z-report" className="fixed inset-0 z-[60] flex flex-col bg-neutral-100 text-neutral-900">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6 print:hidden">
        <button type="button" onClick={onClose} className="inline-flex h-9 items-center gap-2 rounded-xl px-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 cursor-pointer">
          <ArrowLeft className="h-4 w-4" /> Analytics
        </button>

        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Previous day" onClick={() => z.setDate(shiftDay(z.date, -1))} className={iconBtn}><ChevronLeft className="h-4 w-4" /></button>
          <input type="date" aria-label="Business day" value={z.date} max={z.today} onChange={(e) => z.setDate(e.target.value)}
            className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 outline-none focus:border-neutral-500" />
          <button type="button" aria-label="Next day" disabled={z.date >= z.today} onClick={() => z.setDate(shiftDay(z.date, 1))} className={iconBtn}><ChevronRight className="h-4 w-4" /></button>
          {z.date !== z.today && (
            <button type="button" onClick={() => z.setDate(z.today)} className="h-9 rounded-xl px-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer">Today</button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" aria-label="Refresh" onClick={() => void z.reload()} className={iconBtn}>
            <RefreshCw className={`h-4 w-4 ${z.isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={() => window.print()} disabled={!z.data || z.isLoading}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-neutral-950 px-4 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer">
            <Printer className="h-4 w-4" /> Print Z-report
          </button>
        </div>
      </div>

      <div className="z-scroll flex-1 overflow-y-auto px-3 py-6 sm:px-8 sm:py-10">
        {z.error ? (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center">
            <p className="font-serif text-lg text-neutral-950">The report could not be loaded</p>
            <p className="mt-1 text-sm text-neutral-600">{z.error}</p>
            <button type="button" onClick={() => void z.reload()} className="mt-4 rounded-xl bg-neutral-950 px-4 py-2 text-xs font-semibold text-white cursor-pointer">Try again</button>
          </div>
        ) : !z.data ? (
          <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
            <div className="h-40 animate-pulse rounded-3xl bg-white" />
            <div className="h-72 animate-pulse rounded-3xl bg-white" />
          </div>
        ) : (
          <div className={`transition-opacity ${z.isLoading ? 'opacity-50' : ''}`}><ZReportDocument key={z.data.period.from} report={z.data} /></div>
        )}
      </div>
    </div>,
    document.body,
  );
}
