// Writing a chosen photo onto a dish. The dish and the photo must both belong to the venue.
import { stockSearchConfigured } from './photo-sources';
import { isStockImageUrl, isUnsplashDownload } from './stock-providers';

export type AssignInput =
  | { source: 'vault'; vault_id: string }
  | { source: 'unsplash'; url: string; download_location?: string };

export type AssignResult = { ok: true; image_url: string } | { ok: false; status: number; error: string };

async function resolveImage(db: any, businessId: string, input: AssignInput): Promise<AssignResult> {
  if (input.source === 'vault') {
    const { data, error } = await db.from('venue_photo_vault').select('image_url')
      .eq('id', input.vault_id).eq('venue_id', businessId).eq('is_active', true).maybeSingle();
    if (error) throw error;
    if (!data?.image_url) return { ok: false, status: 404, error: 'That photo is no longer in your Photo Vault.' };
    return { ok: true, image_url: data.image_url };
  }
  if (input.source === 'unsplash') {
    if (!isStockImageUrl(input.url)) {
      return { ok: false, status: 400, error: 'Only photos from the stock library can be used here.' };
    }
    return { ok: true, image_url: input.url };
  }
  return { ok: false, status: 400, error: 'Choose a photo source.' };
}

/** Unsplash asks every use of a photo to be reported. Best effort: a failed ping never blocks the save. */
async function reportUnsplashUse(downloadLocation?: string) {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key || !isUnsplashDownload(downloadLocation)) return;
  await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${key}` }, cache: 'no-store' } as RequestInit).catch(() => {});
}

export async function assignDishPhoto(db: any, businessId: string, itemId: string, input: AssignInput): Promise<AssignResult> {
  const { data: item, error: itemErr } = await db.from('catalog_items').select('id')
    .eq('id', itemId).eq('business_id', businessId).maybeSingle();
  if (itemErr) throw itemErr;
  if (!item) return { ok: false, status: 404, error: 'That dish is not on your menu.' };

  const resolved = await resolveImage(db, businessId, input);
  if (!resolved.ok) return resolved;

  const { error } = await db.from('catalog_items').update({ image_url: resolved.image_url })
    .eq('id', itemId).eq('business_id', businessId);
  if (error) throw error;

  if (input.source === 'unsplash' && stockSearchConfigured()) await reportUnsplashUse(input.download_location);
  return resolved;
}
