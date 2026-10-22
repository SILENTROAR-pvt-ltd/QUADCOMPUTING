'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SettledOrderBill } from '@/lib/services/guest-auth/guest-bills.service';
import { canShareImage, downloadBlob, safeFileName, shareImage } from '@/lib/guest/image-share';
import { screenPicture } from '@/lib/guest/screen-picture';

interface Options {
  venueId: string;
  table: string;
  orderId: string;
  venueName?: string;
  /** Take the picture as soon as the bill has loaded (the "Download bill" button on the thank-you card). */
  autoDownload: boolean;
}

/**
 * The venue's own bill for this order, fetched for the device that took part in it, and the ways to keep it as a picture.
 * The picture is made as soon as the bill is on screen, so a tap on "Save to gallery" opens the share sheet at once: a
 * phone only opens it straight after a tap, and drawing the bill first used to take too long.
 */
export function useSettledBill({ venueId, table, orderId, venueName, autoDownload }: Options) {
  const [bill, setBill] = useState<SettledOrderBill | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'download' | 'save' | null>(null);
  const [note, setNote] = useState('');
  const [canShare, setCanShare] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const picture = useRef<Promise<Blob> | null>(null);
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

  // One picture per bill, started once the receipt is drawn. A failed attempt is forgotten, so the next tap tries again.
  const getPicture = useCallback((): Promise<Blob> => {
    if (!picture.current) {
      const node = receiptRef.current;
      if (!node) return Promise.reject(new Error('The bill is not on screen yet.'));
      picture.current = screenPicture(node).catch((err) => { picture.current = null; throw err; });
    }
    return picture.current;
  }, []);

  useEffect(() => {
    if (!bill) return;
    picture.current = null;
    const frame = requestAnimationFrame(() => { void getPicture().catch(() => {}); });
    return () => cancelAnimationFrame(frame);
  }, [bill, getPicture]);

  const fileName = safeFileName(bill?.venue.name || venueName, 'bill', bill ? new Date(bill.created_at) : new Date());

  const download = useCallback(async () => {
    setNote('');
    setBusy('download');
    try { downloadBlob(await getPicture(), fileName); setNote('Your bill has been downloaded.'); }
    catch { setNote('We could not prepare your bill as a picture. You can use Print / save PDF instead.'); }
    finally { setBusy(null); }
  }, [getPicture, fileName]);

  const saveToGallery = async () => {
    setNote('');
    setBusy('save');
    let blob: Blob | null = null;
    try {
      blob = await getPicture();
      const handed = await shareImage(blob, fileName, `${bill?.venue.name || venueName || 'Your'} bill`);
      if (handed) setNote('Choose "Save image" to keep it in your gallery.');
    } catch {
      // The share sheet refused (an in-app browser, or the tap was too long ago): save the file the plain way instead.
      if (blob) { downloadBlob(blob, fileName); setNote('Your bill has been downloaded. Open it from Downloads to keep it.'); }
      else setNote('We could not prepare your bill as a picture. You can use Print / save PDF instead.');
    } finally { setBusy(null); }
  };

  useEffect(() => {
    if (!autoDownload || !bill || autoDone.current) return;
    autoDone.current = true;
    const timer = setTimeout(() => { void download(); }, 350);
    return () => clearTimeout(timer);
  }, [autoDownload, bill, download]);

  return { bill, error, busy, note, canShare, receiptRef, download, saveToGallery };
}
