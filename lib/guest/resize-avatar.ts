'use client';

import { PHOTO_MAX_BYTES, PHOTO_SIZE_PX } from './avatar-options';

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
}

/**
 * A guest's photo as a square JPEG: centre-cropped, scaled to PHOTO_SIZE_PX, and encoded at the
 * highest quality that fits under PHOTO_MAX_BYTES. The original file never leaves the browser.
 */
export async function squarePhotoBlob(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That image could not be read. Try a JPEG, PNG or WebP photo.');
  }

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_SIZE_PX;
    canvas.height = PHOTO_SIZE_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot prepare the photo. Try another browser.');
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, PHOTO_SIZE_PX, PHOTO_SIZE_PX);

    for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5]) {
      const blob = await encode(canvas, quality);
      if (blob && blob.size <= PHOTO_MAX_BYTES) return blob;
    }
    throw new Error('That photo is too detailed to shrink. Try another.');
  } finally {
    bitmap.close();
  }
}
