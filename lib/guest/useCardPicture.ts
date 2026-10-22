'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { screenPicture } from './screen-picture';
import { canShareImage, downloadBlob, shareImage } from './image-share';

/**
 * Keeps a card on screen (a booking code, a pass) as a picture on the guest's phone. The picture is made as soon as the
 * card is drawn, so a tap opens the phone's share sheet at once ("Save image" puts it in the gallery); a phone opens
 * that sheet only straight after a tap. Where there is no share sheet, or it refuses, the picture downloads instead.
 */
export function useCardPicture(fileName: string, title: string) {
  const ref = useRef<HTMLDivElement>(null);
  const picture = useRef<Promise<Blob> | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => { setCanShare(canShareImage()); }, []);

  const get = useCallback((): Promise<Blob> => {
    if (!picture.current) {
      const node = ref.current;
      if (!node) return Promise.reject(new Error('The card is not on screen yet.'));
      picture.current = screenPicture(node).catch((err) => { picture.current = null; throw err; });
    }
    return picture.current;
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => { void get().catch(() => {}); });
    return () => cancelAnimationFrame(frame);
  }, [get]);

  const save = async () => {
    setNote('');
    setBusy(true);
    let blob: Blob | null = null;
    try {
      blob = await get();
      if (canShare && await shareImage(blob, fileName, title)) setNote('Choose "Save image" to keep it in your gallery.');
      else if (!canShare) { downloadBlob(blob, fileName); setNote('Saved. Find it in your downloads.'); }
    } catch {
      if (blob) { downloadBlob(blob, fileName); setNote('Saved. Find it in your downloads.'); }
      else setNote('The picture could not be made. Take a screenshot instead.');
    } finally {
      setBusy(false);
    }
  };

  return { ref, canShare, busy, note, save };
}
