'use client';

/** Saving a picture on the guest's phone: a plain download, or the phone's own share sheet (where "Save image" goes to the gallery). */

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Can this phone hand a picture to its share sheet? */
export function canShareImage(): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
    return navigator.canShare({ files: [new File([new Blob(['x'], { type: 'image/png' })], 'bill.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

/** Opens the share sheet with the picture. Returns false if the guest closed it, true if it was handed over. */
export async function shareImage(blob: Blob, fileName: string, title: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: 'image/png' });
  try {
    await navigator.share({ files: [file], title });
    return true;
  } catch (e: any) {
    if (e?.name === 'AbortError') return false;
    throw e;
  }
}

export function safeFileName(venue: string | undefined, kind: string, when: Date = new Date()): string {
  const slug = (venue || kind).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || kind;
  return `${slug}-${kind}-${when.toISOString().slice(0, 10)}.png`;
}
