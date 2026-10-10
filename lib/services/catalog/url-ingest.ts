// Puts a photo from a web address on one dish. The server downloads it and keeps its own copy, so the
// dish never depends on another site's link staying up.
import { fetchPublicImage, UnsafeUrlError, type Resolver } from './safe-fetch';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export interface UrlIngestDeps {
  fetchImpl?: typeof fetch;
  resolve?: Resolver;
  upload: (path: string, bytes: Buffer, mimeType: string) => Promise<string>;
}
export type UrlIngestResult = { ok: true; image_url: string } | { ok: false; status: number; error: string };

export async function ingestDishImageUrl(db: any, businessId: string, itemId: string, rawUrl: string, deps: UrlIngestDeps): Promise<UrlIngestResult> {
  const { data: item, error: itemErr } = await db.from('catalog_items').select('id')
    .eq('id', itemId).eq('business_id', businessId).maybeSingle();
  if (itemErr) throw itemErr;
  if (!item) return { ok: false, status: 404, error: 'That dish is not on your menu.' };

  let image;
  try {
    image = await fetchPublicImage(rawUrl, deps.fetchImpl, deps.resolve);
  } catch (e: any) {
    if (e instanceof UnsafeUrlError) return { ok: false, status: 400, error: e.message };
    return { ok: false, status: 502, error: 'That photo could not be downloaded. Check the link and try again.' };
  }

  const path = `${businessId}/dishes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[image.mimeType] ?? 'jpg'}`;
  const imageUrl = await deps.upload(path, image.bytes, image.mimeType);
  const { error } = await db.from('catalog_items').update({ image_url: imageUrl })
    .eq('id', itemId).eq('business_id', businessId);
  if (error) throw error;
  return { ok: true, image_url: imageUrl };
}
