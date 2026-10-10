// Ingests dish photos into the venue's Photo Vault: stores the image, reads it with the vision model
// (when configured) for its dish names and tags, and records it. Without a model key, the file name
// is used as the title, so ingest still works and the photo can still be matched.
import { describePhoto, type GenerateJson, type PhotoReading } from './vault-describe';

export const DISH_CATEGORY = 'Dish photos';
export const MAX_PHOTOS = 10;
const MAX_BASE64 = 8_000_000;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export interface IncomingPhoto { filename: string; mimeType: string; base64: string }
export interface IngestRow { filename: string; status: 'added' | 'failed'; id?: string; title?: string; dish_names?: string[]; reason?: string; note?: string }
export interface IngestDeps {
  generate?: GenerateJson;
  upload: (path: string, bytes: Buffer, mimeType: string) => Promise<string>;
}

/** A problem with the request as a whole, or null. Per-photo problems are reported per photo instead. */
export function validateBatch(photos: unknown): string | null {
  if (!Array.isArray(photos) || photos.length === 0) return 'Choose at least one photo.';
  if (photos.length > MAX_PHOTOS) return `Add up to ${MAX_PHOTOS} photos at a time.`;
  return null;
}

/** The title a photo gets when no model reads it: the file name, tidied. */
export function titleFromFilename(filename: string): string {
  return filename.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Dish photo';
}

async function ingestOne(db: any, businessId: string, p: IncomingPhoto, deps: IngestDeps): Promise<IngestRow> {
  const ext = EXT[p.mimeType];
  if (!ext) return { filename: p.filename, status: 'failed', reason: 'Only JPG, PNG or WebP photos.' };
  if (typeof p.base64 !== 'string' || p.base64.length === 0 || p.base64.length > MAX_BASE64) {
    return { filename: p.filename, status: 'failed', reason: 'The photo is empty or larger than 6 MB.' };
  }
  // A free model can fail or refuse an image. The photo is still kept, titled from its file name.
  let reading: PhotoReading | null = null;
  let note: string | undefined;
  if (deps.generate) {
    try {
      reading = await describePhoto(deps.generate, p.base64, p.mimeType);
      if (!reading) note = 'The model could not read this photo; the file name is used as its title.';
    } catch {
      note = 'The model could not read this photo; the file name is used as its title.';
    }
  }
  if (reading && !reading.is_food) return { filename: p.filename, status: 'failed', reason: 'Not a food or drink photo.' };

  const bytes = Buffer.from(p.base64, 'base64');
  const path = `${businessId}/dishes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const url = await deps.upload(path, bytes, p.mimeType);
  const names = reading?.dish_names ?? [];
  const title = reading?.title || titleFromFilename(p.filename);
  const { data, error } = await db.from('venue_photo_vault').insert({
    venue_id: businessId, title, category: DISH_CATEGORY, description: reading?.description || '',
    tags: [...names, ...(reading?.tags ?? [])], image_url: url, is_active: true,
  }).select('id').single();
  if (error) throw error;
  return { filename: p.filename, status: 'added', id: data.id, title, dish_names: names, note };
}

export async function ingestDishPhotos(db: any, businessId: string, photos: IncomingPhoto[], deps: IngestDeps): Promise<IngestRow[]> {
  const rows: IngestRow[] = [];
  for (const p of photos) {
    try {
      rows.push(await ingestOne(db, businessId, p, deps));
    } catch (e: any) {
      rows.push({ filename: p.filename, status: 'failed', reason: e?.message || 'Could not save this photo.' });
    }
  }
  return rows;
}

/** Stores the image in the venue's storage bucket, creating the bucket on first use. */
export async function uploadVaultObject(db: any, path: string, bytes: Buffer, mimeType: string): Promise<string> {
  const bucket = db.storage.from('venue-vault');
  let { error } = await bucket.upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error && /bucket not found/i.test(error.message)) {
    await db.storage.createBucket('venue-vault', { public: true });
    ({ error } = await db.storage.from('venue-vault').upload(path, bytes, { contentType: mimeType, upsert: false }));
  }
  if (error) throw error;
  return db.storage.from('venue-vault').getPublicUrl(path).data.publicUrl as string;
}
