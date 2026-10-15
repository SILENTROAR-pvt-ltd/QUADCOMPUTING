'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ImageDown, Printer, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { ThermalReceiptView } from '@/components/shared/receipt/ThermalReceiptView';
import type { SettledOrderBill } from '@/lib/services/guest-auth/guest-bills.service';
import { canShareImage, downloadBlob, safeFileName, shareImage } from '@/lib/guest/image-share';

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

/**
 * The bill the venue generated for this order: the same receipt the host prints, fetched for the order this device took part
 * in. It can be viewed, downloaded as a picture, saved through the phone's share sheet, or printed to PDF.
 */
export function SettledBillSheet({ venueId, table, orderId, venueName, autoDownload = false, onClose }: Props) {
  const [bill, setBill] = useState<SettledOrderBill | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'download' | 'save' | null>(null);
  const [note, setNote] = useState('');
  const [canShare, setCanShare] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const autoDone = useRef(false);

  useEffect(() => { setCanShare(canShareImage()); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const q = new URLSearchParams({ cafe_id: venueId, table, order_id: orderId });
        const res = await fetch(`/api/guest/bill?${q.toString()}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!live) return;
        if (res.ok && data?.success && data.bill) setBill(data.bill);
        else setError(data?.error || 'We could not load your bill. Please try again in a moment.');
      } catch {
        if (live) setError('We could not reach the venue. Please check your connection and try again.');
      }
    })();
    return () => { live = false; };
  }, [venueId, table, orderId]);

  const makePicture = useCallback(async (): Promise<Blob> => {
    const node = receiptRef.current;
    if (!node) throw new Error('The bill is not on screen yet.');
    // Fonts finish loading first, so the picture matches what is on screen.
    try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* draw anyway */ }
    const url = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
    return await (await fetch(url)).blob();
  }, []);

  const fileName = safeFileName(bill?.venue.name || venueName, 'bill', bill ? new Date(bill.created_at) : new Date());

  const download = useCallback(async () => {
    setNote(''); setBusy('download');
    try { downloadBlob(await makePicture(), fileName); setNote('Your bill has been downloaded.'); }
    catch { setNote('We could not prepare your bill as a picture. You can use Print / save PDF instead.'); }
    finally { setBusy(null); }
  }, [makePicture, fileName]);

  const saveToGallery = async () => {
    setNote(''); setBusy('save');
    try {
      const handed = await shareImage(await makePicture(), fileName, `${bill?.venue.name || venueName || 'Your'} bill`);
      if (handed) setNote('Choose "Save image" to keep it in your gallery.');
    } catch { setNote('We could not save your bill. Please try Download instead.'); }
    finally { setBusy(null); }
  };

  // "Download bill" on the card: once the receipt is drawn, take the picture.
  useEffect(() => {
    if (!autoDownload || !bill || autoDone.current) return;
    autoDone.current = true;
    const timer = setTimeout(() => { void download(); }, 350);
    return () => clearTimeout(timer);
  }, [autoDownload, bill, download]);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-zinc-950/45 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your bill"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-md sm:rounded-[28px]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3.5 print:hidden">
          <div className="min-w-0">
            <p className="truncate text-[17px] text-zinc-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Your bill{bill ? ` · #${bill.invoice_no}` : ''}</p>
            <p className="truncate text-[11.5px] text-zinc-500">{bill?.venue.name || venueName || 'Thank you for dining with us'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close bill" className="grid h-9 w-9 place-items-center rounded-full text-zinc-500 hover:bg-neutral-100 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-[160px] flex-1 overflow-y-auto bg-neutral-50">
          {!bill && !error && <p className="py-16 text-center text-[13px] text-zinc-500">Preparing your bill…</p>}
          {error && <p role="alert" className="px-6 py-16 text-center text-[13px] leading-relaxed text-zinc-600">{error}</p>}
          {bill && (
            <div id="guest-settled-bill" ref={receiptRef} className="mx-auto max-w-[420px] bg-white">
              <ThermalReceiptView invoice={bill.invoice} venue={bill.venue} showPayQr={false} isOnline />
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-neutral-100 px-5 py-3.5 print:hidden">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={download}
              disabled={!bill || busy !== null}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0A3222] text-[13px] font-semibold text-white transition-colors hover:bg-[#0d3f2b] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-4 w-4" aria-hidden /> {busy === 'download' ? 'Preparing…' : 'Download bill'}
            </button>
            {canShare ? (
              <button
                type="button"
                onClick={saveToGallery}
                disabled={!bill || busy !== null}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <ImageDown className="h-4 w-4" aria-hidden /> {busy === 'save' ? 'Opening…' : 'Save to gallery'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!bill}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Printer className="h-4 w-4" aria-hidden /> Print / save PDF
              </button>
            )}
          </div>
          {note && <p role="status" className="text-center text-[12px] text-zinc-500">{note}</p>}
        </div>
        <style>{PRINT_CSS}</style>
      </div>
    </div>
  );
}

export default SettledBillSheet;
