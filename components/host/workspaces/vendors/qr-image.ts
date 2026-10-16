'use client';

import { QR_MAX_CHARS } from '@/lib/services/vendors/vendor-input';

const MAX_SIDE = 640;

/**
 * Reads an uploaded QR photo or screenshot and shrinks it to at most 640px a side, as a data URL the server accepts.
 * PNG keeps a QR crisp; a large photo falls back to JPEG so it stays under the size limit.
 */
export async function qrFileToDataUrl(file: File): Promise<string> {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) throw new Error('Choose a PNG, JPG or WebP image.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That image could not be opened.'));
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot prepare the image.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL('image/png');
    for (const quality of [0.9, 0.75, 0.6]) {
      if (data.length <= QR_MAX_CHARS) break;
      data = canvas.toDataURL('image/jpeg', quality);
    }
    if (data.length > QR_MAX_CHARS) throw new Error('That image is too large. Try a screenshot of just the QR.');
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
