'use client';

/** The longest side a vault photo is stored at: sharp on a phone, light to load at the foot of the menu. */
const MAX_SIDE = 1600;

/**
 * Shrinks a chosen photo in the browser before it is sent: the longest side at most 1600 px, saved as a JPEG. Returns the
 * base64 body (without the data: prefix) and its type, or null when the browser cannot read the file as an image.
 */
export async function shrinkPhoto(file: File): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mimeType: 'image/jpeg' };
  } catch {
    return null;
  }
}
