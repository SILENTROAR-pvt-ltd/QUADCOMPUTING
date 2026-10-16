'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, ImageDown, Printer, X } from 'lucide-react';
import { ThermalReceiptView } from '@/components/shared/receipt/ThermalReceiptView';
import { useSettledBill } from './useSettledBill';
import { press } from '../motion';

interface Props {
  venueId: string;
  table: string;
  orderId: string;
  venueName?: string;
  /** Prepare and download the picture as soon as the bill has loaded (the "Download bill" button on the thank-you card). */
  autoDownload?: boolean;
  onClose: () => void;
}

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #guest-settled-bill, #guest-settled-bill * { visibility: visible !important; }
  #guest-settled-bill { position: absolute !important; left: 0; top: 0; width: 100%; }
}`;
const GHOST = 'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white text-[13px] font-semibold text-zinc-900 hover:bg-neutral-50 disabled:opacity-50';

/**
 * The bill the venue generated for this order: the same receipt the host prints, fetched for the order this device took part
 * in. It can be viewed, downloaded as a picture, saved through the phone's share sheet, or printed to PDF.
 */
export function SettledBillSheet({ venueId, table, orderId, venueName, autoDownload = false, onClose }: Props) {
  const b = useSettledBill({ venueId, table, orderId, venueName, autoDownload });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-zinc-950/45 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-label="Your bill" onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-md sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3.5 print:hidden">
          <div className="min-w-0">
            <p className="truncate text-[17px] text-zinc-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Your bill{b.bill ? ` · #${b.bill.invoice_no}` : ''}</p>
            <p className="truncate text-[11.5px] text-zinc-500">{b.bill?.venue.name || venueName || 'Thank you for dining with us'}</p>
          </div>
          <motion.button type="button" onClick={onClose} aria-label="Close bill" {...press} className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-zinc-500 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </motion.button>
        </div>

        <div className="min-h-[160px] flex-1 overflow-y-auto bg-neutral-50">
          {!b.bill && !b.error && <div className="shimmer mx-auto my-6 h-72 w-[85%] max-w-[360px] rounded-xl" role="status" aria-label="Preparing your bill" />}
          {b.error && <p role="alert" className="px-6 py-16 text-center text-[13px] leading-relaxed text-zinc-600">{b.error}</p>}
          {b.bill && (
            <div id="guest-settled-bill" ref={b.receiptRef} className="mx-auto max-w-[420px] bg-white">
              <ThermalReceiptView invoice={b.bill.invoice} venue={b.bill.venue} showPayQr={false} isOnline />
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-neutral-100 px-5 py-3.5 print:hidden">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <motion.button type="button" onClick={() => void b.download()} disabled={!b.bill || b.busy !== null} {...press}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0A3222] text-[13px] font-semibold text-white hover:bg-[#0d3f2b] disabled:opacity-50">
              <Download className="h-4 w-4" aria-hidden /> {b.busy === 'download' ? 'Preparing…' : 'Download bill'}
            </motion.button>
            {b.canShare ? (
              <motion.button type="button" onClick={() => void b.saveToGallery()} disabled={!b.bill || b.busy !== null} {...press} className={GHOST}>
                <ImageDown className="h-4 w-4" aria-hidden /> {b.busy === 'save' ? 'Opening…' : 'Save to gallery'}
              </motion.button>
            ) : (
              <motion.button type="button" onClick={() => window.print()} disabled={!b.bill} {...press} className={GHOST}>
                <Printer className="h-4 w-4" aria-hidden /> Print / save PDF
              </motion.button>
            )}
          </div>
          {b.note && <p role="status" className="text-center text-[12px] text-zinc-500">{b.note}</p>}
        </div>
        <style>{PRINT_CSS}</style>
      </motion.div>
    </div>
  );
}

export default SettledBillSheet;
