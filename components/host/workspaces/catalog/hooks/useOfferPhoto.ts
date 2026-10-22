'use client';

import { useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { shrinkImage } from '@/lib/utils/image-shrink';

export type PhotoMode = 'upload' | 'link' | 'none';

/**
 * An offer's photo while the host fills the form: uploaded from the phone (shrunk first), or taken from a pasted link.
 * Either way the server stores its own copy and returns the address the offer is saved with.
 */
export function useOfferPhoto() {
  const [mode, setMode] = useState<PhotoMode>('upload');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    const res = await apiRequest<{ image_url: string }>('/api/venue/offers/photo', jsonRequest('POST', payload));
    setBusy(false);
    if (res.ok && res.data?.image_url) setImageUrl(res.data.image_url);
    else setError(res.error ?? 'The photo could not be saved. Please try again.');
  };

  const fromFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const shrunk = await shrinkImage(file);
      await save({ base64: shrunk.base64, mimeType: shrunk.mimeType });
    } catch (e: any) {
      setError(e?.message || 'That photo could not be used.');
    }
  };

  const fromLink = async () => {
    const url = link.trim();
    if (!/^https:\/\//i.test(url)) { setError('Paste a photo link that starts with https://'); return; }
    await save({ url });
  };

  const clear = () => { setImageUrl(null); setLink(''); setError(null); };
  const choose = (next: PhotoMode) => { setMode(next); setError(null); if (next === 'none') clear(); };

  return { mode, choose, imageUrl, link, setLink, busy, error, fromFile, fromLink, clear, reset: () => { clear(); setMode('upload'); } };
}

export type OfferPhoto = ReturnType<typeof useOfferPhoto>;
