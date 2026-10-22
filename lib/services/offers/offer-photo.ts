// A live offer's photo: uploaded from the host's phone, or downloaded from a link the host pastes. Both end up as the
// server's own copy in the venue's storage, so an offer never depends on another site's link, and only an address in
// that folder is ever saved on an offer.
import { fetchPublicImage, UnsafeUrlError, MAX_IMAGE_BYTES, type Resolver } from '@/lib/services/catalog/safe-fetch';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BASE64 = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 16;

export interface OfferPhotoDeps {
  upload: (path: string, bytes: Buffer, mimeType: string) => Promise<string>;
  fetchImpl?: typeof fetch;
  resolve?: Resolver;
}
export type OfferPhotoInput = { base64?: unknown; mimeType?: unknown; url?: unknown };
export type OfferPhotoResult = { ok: true; image_url: string } | { ok: false; status: number; error: string };

const folder = (businessId: string) => `${businessId}/offers`;

/** Stores the photo and returns its address. */
export async function storeOfferPhoto(businessId: string, input: OfferPhotoInput, deps: OfferPhotoDeps): Promise<OfferPhotoResult> {
  let bytes: Buffer;
  let mimeType: string;
  if (typeof input.url === 'string' && input.url.trim()) {
    try {
      ({ bytes, mimeType } = await fetchPublicImage(input.url.trim(), deps.fetchImpl, deps.resolve));
    } catch (e) {
      if (e instanceof UnsafeUrlError) return { ok: false, status: 400, error: e.message };
      return { ok: false, status: 502, error: 'That photo could not be downloaded. Check the link and try again.' };
    }
  } else {
    mimeType = String(input.mimeType || '').toLowerCase();
    if (!EXT[mimeType]) return { ok: false, status: 400, error: 'Use a JPG, PNG or WebP photo.' };
    const b64 = typeof input.base64 === 'string' ? input.base64.replace(/^data:[^,]*,/, '') : '';
    if (!b64 || b64.length > MAX_BASE64) return { ok: false, status: 400, error: 'The photo is empty or larger than 6 MB.' };
    bytes = Buffer.from(b64, 'base64');
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return { ok: false, status: 400, error: 'The photo is empty or larger than 6 MB.' };
  }
  const path = `${folder(businessId)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[mimeType] ?? 'jpg'}`;
  return { ok: true, image_url: await deps.upload(path, bytes, mimeType) };
}

/**
 * Whether an address may be saved as this venue's offer photo: only the public address of a file in this venue's own
 * offers folder. `storageBase` is the project's Supabase URL.
 */
export function isOwnOfferPhoto(url: unknown, businessId: string, storageBase: string | undefined): boolean {
  if (typeof url !== 'string' || !storageBase) return false;
  const prefix = `${storageBase.replace(/\/+$/, '')}/storage/v1/object/public/venue-vault/${folder(businessId)}/`;
  return url.startsWith(prefix) && !url.slice(prefix.length).includes('..') && url.length < 600;
}

/**
 * The image_url to save from a request: undefined to leave it as it is, null to remove it, or the address. An address
 * from anywhere else is refused (`invalid`).
 */
export function readOfferImage(raw: unknown, businessId: string, storageBase: string | undefined): { value?: string | null; invalid?: boolean } {
  if (raw === undefined) return {};
  if (raw === null || raw === '') return { value: null };
  return isOwnOfferPhoto(raw, businessId, storageBase) ? { value: raw as string } : { invalid: true };
}
