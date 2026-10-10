// A guest's uploaded photo: checked by its bytes, stored under a random path, and removed when
// replaced. The storage backend is passed in, so the rules can be tested without a bucket.
import { randomUUID } from 'node:crypto';
import { PHOTO_MAX_BYTES, PHOTO_TYPES, type PhotoType } from '@/lib/guest/avatar-options';

export const AVATAR_BUCKET = 'guest-avatars';

export interface PhotoStore {
  put(path: string, bytes: Uint8Array, contentType: PhotoType): Promise<void>;
  remove(paths: string[]): Promise<void>;
}

/** The image type the bytes really are, from their signature. The declared type is not trusted. */
export function detectPhotoType(bytes: Uint8Array): PhotoType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return 'image/png';
  }
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
    && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return 'image/webp';
  }
  return null;
}

/** Public URL of a file in a public bucket, from the project's Supabase URL. */
export function mediaPublicUrl(bucket: string, path: string | null, baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''): string | null {
  if (!baseUrl || !path) return null;
  return `${baseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${path}`;
}

/** Public URL of a stored avatar. */
export function avatarPublicUrl(path: string, baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''): string | null {
  return mediaPublicUrl(AVATAR_BUCKET, path, baseUrl);
}

export type PhotoSaveResult =
  | { ok: true; photo_path: string; replaced: string | null }
  | { ok: false; status: number; error: string };

/**
 * Stores a new photo for the account, then points the account at it. The old photo is removed only
 * after the new one is recorded, so a failure never leaves the account without any picture.
 */
export async function saveGuestPhoto(
  db: any,
  store: PhotoStore,
  account: { id: string; photo_path: string | null },
  bytes: Uint8Array,
  declaredType: unknown
): Promise<PhotoSaveResult> {
  if (bytes.length === 0) return { ok: false, status: 400, error: 'Choose a photo to upload.' };
  if (bytes.length > PHOTO_MAX_BYTES) return { ok: false, status: 413, error: 'That photo is too large. Try a smaller one.' };

  const detected = detectPhotoType(bytes);
  if (!detected) return { ok: false, status: 415, error: 'Upload a JPEG, PNG or WebP photo.' };
  if (declaredType !== undefined && declaredType !== detected) {
    return { ok: false, status: 415, error: 'The photo type does not match the file.' };
  }

  const path = `${account.id}/${randomUUID()}.${PHOTO_TYPES[detected]}`;
  await store.put(path, bytes, detected);

  const { error } = await db.from('guest_accounts').update({ photo_path: path }).eq('id', account.id);
  if (error) {
    await store.remove([path]).catch(() => {});
    throw error;
  }

  if (account.photo_path) await store.remove([account.photo_path]).catch(() => {});
  return { ok: true, photo_path: path, replaced: account.photo_path };
}

/** Clears the account's photo and removes the file. Returns the path that was removed, if any. */
export async function clearGuestPhoto(db: any, store: PhotoStore, account: { id: string; photo_path: string | null }): Promise<string | null> {
  if (!account.photo_path) return null;
  const { error } = await db.from('guest_accounts').update({ photo_path: null }).eq('id', account.id);
  if (error) throw error;
  await store.remove([account.photo_path]).catch(() => {});
  return account.photo_path;
}

/** The Supabase Storage bucket behind PhotoStore. Uploads only happen from the server (service role). */
export function supabasePhotoStore(db: any, bucketName: string = AVATAR_BUCKET): PhotoStore {
  const bucket = db.storage.from(bucketName);
  return {
    async put(path, bytes, contentType) {
      const { error } = await bucket.upload(path, bytes, { contentType, upsert: false, cacheControl: '86400' });
      if (error) throw error;
    },
    async remove(paths) {
      const { error } = await bucket.remove(paths);
      if (error) throw error;
    },
  };
}
