'use client';

// Shrinks a photo on the phone before it is uploaded: a camera picture is often 4-12 MB, which is slow on a venue's Wi-Fi
// and over the 6 MB limit. Drawn at most 1600 px on its long side as a JPEG, it is usually 200-500 KB and looks the same
// on any screen the offer is shown on.
const MAX_SIDE = 1600;
const QUALITY = 0.85;

export interface ShrunkImage { base64: string; mimeType: string; previewUrl: string }

export async function shrinkImage(file: File): Promise<ShrunkImage> {
  if (!/^image\//.test(file.type)) throw new Error('Choose a photo (JPG, PNG or WebP).');
  const sourceUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That photo could not be opened. Try another one.'));
      el.src = sourceUrl;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot prepare the photo.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
    return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mimeType: 'image/jpeg', previewUrl: dataUrl };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
