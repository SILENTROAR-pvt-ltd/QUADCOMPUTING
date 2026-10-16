'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import type { SettledOrderBill } from '@/lib/services/guest-auth/guest-bills.service';
import { canShareImage, downloadBlob, safeFileName, shareImage } from '@/lib/guest/image-share';

interface Options {
  venueId: string;
  table: string;
  orderId: string;
  venueName?: string;
  /** Take the picture as soon as the bill has loaded (the "Download bill" button on the thank-you card). */
  autoDownload: boolean;
}

/** The venue's own bill for this order, fetched for the device that took part in it, and the ways to keep it as a picture. */
export function useSettledBill({ venueId, table, orderId, venueName, autoDownload }: Options) {
  const [bill, setBill] = useState<SettledOrderBill | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'download' | 'save' | null>(null);
  const [note, setNote] = useState('');
  const [canShare, setCanShare] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const autoDone = useRef(false);

  useEffect(() => { setCanShare(canShareImage()); }, []);

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
    setNote('');
    setBusy('download');
    try { downloadBlob(await makePicture(), fileName); setNote('Your bill has been downloaded.'); }
    catch { setNote('We could not prepare your bill as a picture. You can use Print / save PDF instead.'); }
    finally { setBusy(null); }
  }, [makePicture, fileName]);

  const saveToGallery = async () => {
    setNote('');
    setBusy('save');
    try {
      const handed = await shareImage(await makePicture(), fileName, `${bill?.venue.name || venueName || 'Your'} bill`);
      if (handed) setNote('Choose "Save image" to keep it in your gallery.');
    } catch { setNote('We could not save your bill. Please try Download instead.'); }
    finally { setBusy(null); }
  };

  useEffect(() => {
    if (!autoDownload || !bill || autoDone.current) return;
    autoDone.current = true;
    const timer = setTimeout(() => { void download(); }, 350);
    return () => clearTimeout(timer);
  }, [autoDownload, bill, download]);

  return { bill, error, busy, note, canShare, receiptRef, download, saveToGallery };
}
