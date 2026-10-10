'use client';

import { LOBBY_MEDIA_MAX_BYTES, LOBBY_MEDIA_SIDE_PX } from './lobby-rules';

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
}

/**
 * A moment's photo as a JPEG no larger than LOBBY_MEDIA_SIDE_PX on its longest side. The aspect ratio
 * is kept, and the quality drops until the file fits under LOBBY_MEDIA_MAX_BYTES.
 */
export async function fitPhotoBlob(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That image could not be read. Try a JPEG, PNG or WebP photo.');
  }

  try {
    const scale = Math.min(1, LOBBY_MEDIA_SIDE_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot prepare the photo. Try another browser.');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.85, 0.75, 0.65, 0.55]) {
      const blob = await encode(canvas, quality);
      if (blob && blob.size <= LOBBY_MEDIA_MAX_BYTES) return blob;
    }
    throw new Error('That photo is too detailed to shrink. Try another.');
  } finally {
    bitmap.close();
  }
}
