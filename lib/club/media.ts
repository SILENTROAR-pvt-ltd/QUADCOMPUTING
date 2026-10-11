// Club media (avatars, chat images, stories, event covers, property photos) lives in the private
// 'club-media' bucket. Uploads are checked by their bytes, not their name or declared type, and are
// read back only through short-lived signed URLs.
import { randomUUID } from 'node:crypto';
import { fail } from './http';

export const BUCKET = 'club-media';
const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 25 * 1024 * 1024;

export type MediaKind = { type: 'image' | 'video'; ext: string; mime: string };

export function sniffMedia(bytes: Uint8Array): MediaKind | null {
  const b = bytes;
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  if (at(0, 0xff, 0xd8, 0xff)) return { type: 'image', ext: 'jpg', mime: 'image/jpeg' };
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { type: 'image', ext: 'png', mime: 'image/png' };
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return { type: 'image', ext: 'webp', mime: 'image/webp' };
  if (at(4, 0x66, 0x74, 0x79, 0x70)) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    return brand === 'qt  ' ? { type: 'video', ext: 'mov', mime: 'video/quicktime' } : { type: 'video', ext: 'mp4', mime: 'video/mp4' };
  }
  if (at(0, 0x1a, 0x45, 0xdf, 0xa3)) return { type: 'video', ext: 'webm', mime: 'video/webm' };
  return null;
}

/** Reads the request body as one upload and checks it. `allow` limits it to images or videos. */
export async function readUpload(request: Request, allow: Array<'image' | 'video'>): Promise<{ bytes: Uint8Array; kind: MediaKind }> {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > VIDEO_MAX) fail(413, 'That file is too large.');
  const bytes = new Uint8Array(await request.arrayBuffer());
  const kind = sniffMedia(bytes);
  if (!kind || !allow.includes(kind.type)) fail(415, allow.includes('video') ? 'Upload a JPEG, PNG, WebP, MP4 or WebM file.' : 'Upload a JPEG, PNG or WebP image.');
  if (bytes.length > (kind.type === 'image' ? IMAGE_MAX : VIDEO_MAX)) fail(413, kind.type === 'image' ? 'Images can be up to 5 MB.' : 'Clips can be up to 25 MB.');
  return { bytes, kind };
}

export async function storeMedia(db: any, folder: string, ownerId: string, bytes: Uint8Array, kind: MediaKind): Promise<string> {
  const path = `${folder}/${ownerId}/${randomUUID()}.${kind.ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (error) fail(502, 'The upload could not be saved. Please try again.');
  return path;
}

/** Signed URLs for stored paths (one hour). Unknown or failed paths are left out. */
export async function signMedia(db: any, paths: Array<string | null | undefined>, seconds = 3600): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => typeof p === 'string' && p.length > 0)));
  const out = new Map<string, string>();
  if (unique.length === 0 || !db.storage) return out;
  const { data } = await db.storage.from(BUCKET).createSignedUrls(unique, seconds);
  for (const row of data || []) if (row?.path && row?.signedUrl) out.set(row.path, row.signedUrl);
  return out;
}
