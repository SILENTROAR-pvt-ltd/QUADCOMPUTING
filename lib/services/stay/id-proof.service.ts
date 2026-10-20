import { randomUUID } from 'node:crypto';
import { detectPhotoType } from '@/lib/services/guest-auth/guest-avatar.service';
import { PHOTO_TYPES } from '@/lib/guest/avatar-options';

// A guest's government-ID photo: checked by its bytes, stored under a random path in a private bucket, read by the
// host through a signed URL that expires in minutes. The path is kept on the room for the stay and on the stay log
// after it; it is never a public URL.

export const ID_PROOF_BUCKET = 'guest-ids';
export const ID_PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const ID_PROOF_URL_SECONDS = 10 * 60;
const PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export type IdProofCheck = { ok: true; type: string; ext: string } | { ok: false; status: number; error: string };

export function checkIdProof(bytes: Uint8Array): IdProofCheck {
  if (bytes.length === 0) return { ok: false, status: 400, error: 'Take or choose a photo of the ID.' };
  if (bytes.length > ID_PROOF_MAX_BYTES) return { ok: false, status: 413, error: 'That photo is too large (5 MB at most).' };
  const type = detectPhotoType(bytes);
  if (!type) return { ok: false, status: 415, error: 'Upload a JPEG, PNG or WebP photo.' };
  return { ok: true, type, ext: PHOTO_TYPES[type] };
}

export const idProofPath = (businessId: string, ext: string) => `${businessId}/${randomUUID()}.${ext}`;

/** Only a path under the venue's own prefix may be attached to one of its rooms. */
export const idProofBelongsTo = (path: string | null | undefined, businessId: string) =>
  typeof path === 'string' && PATH.test(path) && path.startsWith(`${businessId}/`);

export async function storeIdProof(db: any, businessId: string, bytes: Uint8Array, type: string, ext: string): Promise<string> {
  const path = idProofPath(businessId, ext);
  const { error } = await db.storage.from(ID_PROOF_BUCKET).upload(path, bytes, { contentType: type, upsert: false, cacheControl: '0' });
  if (error) throw error;
  return path;
}

export async function signedIdProofUrl(db: any, path: string, seconds = ID_PROOF_URL_SECONDS): Promise<string | null> {
  const { data, error } = await db.storage.from(ID_PROOF_BUCKET).createSignedUrl(path, seconds);
  if (error) {
    console.error('[id proof] signed url failed', error.message);
    return null;
  }
  return data?.signedUrl || null;
}

export async function removeIdProof(db: any, path: string): Promise<void> {
  const { error } = await db.storage.from(ID_PROOF_BUCKET).remove([path]);
  if (error) console.error('[id proof] remove failed', error.message);
}
