'use client';

import { useEffect, useRef, useState } from 'react';
import { fitPhotoBlob } from '@/lib/guest/fit-photo';

/**
 * The photo of a postcard: picked from the gallery or taken with the camera, fitted down for upload, and previewed from
 * the device (the preview URL is released again when the photo changes or the composer closes).
 */
export function usePostcardPhoto(onError: (message: string | null) => void) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const pick = async (file: File | undefined, input: HTMLInputElement | null) => {
    if (!file) return;
    onError(null);
    setReading(true);
    try {
      setPhoto(await fitPhotoBlob(file));
    } catch (e: any) {
      onError(e?.message || 'That photo could not be added.');
    } finally {
      setReading(false);
      if (input) input.value = '';
    }
  };

  return { photo, preview, reading, gallery, camera, pick, openGallery: () => gallery.current?.click(), openCamera: () => camera.current?.click() };
}
