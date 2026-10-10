// Downloads a photo for a dish without letting the server reach private networks: https only, every
// resolved address must be public, each redirect is checked again, and the file must be a small JPG/PNG/WebP.
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^22[4-9]\./, /^2[3-5]\d\./];

export class UnsafeUrlError extends Error {}
export type Resolver = (host: string) => Promise<string[]>;
export interface FetchedImage { bytes: Buffer; mimeType: string }

const defaultResolver: Resolver = async (host) => (await dnsLookup(host, { all: true })).map((a) => a.address);

export function isPublicAddress(ip: string): boolean {
  if (isIP(ip) === 4) return !PRIVATE_V4.some((r) => r.test(ip));
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    return !(v === '::1' || v === '::' || v.startsWith('::ffff:') || /^f[cd]/.test(v) || /^fe[89ab]/.test(v));
  }
  return false;
}

export async function assertPublicHttpsUrl(raw: string, resolve: Resolver = defaultResolver): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new UnsafeUrlError('That is not a valid web address.'); }
  if (url.protocol !== 'https:') throw new UnsafeUrlError('Only https:// photo links can be used.');
  if (url.username || url.password) throw new UnsafeUrlError('That address is not a public web address.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [host] : await resolve(host).catch(() => [] as string[]);
  if (addresses.length === 0 || !addresses.every(isPublicAddress)) throw new UnsafeUrlError('That address is not a public web address.');
  return url;
}

async function readImage(res: Response): Promise<FetchedImage> {
  const mimeType = (res.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (!IMAGE_TYPES.has(mimeType)) throw new UnsafeUrlError('That link is not a JPG, PNG or WebP photo.');
  if (Number(res.headers.get('content-length') ?? 0) > MAX_IMAGE_BYTES) throw new UnsafeUrlError('That photo is larger than 6 MB.');
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) throw new UnsafeUrlError('That photo is empty or larger than 6 MB.');
  return { bytes, mimeType };
}

export async function fetchPublicImage(raw: string, fetchImpl: typeof fetch = fetch, resolve?: Resolver): Promise<FetchedImage> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const url = await assertPublicHttpsUrl(current, resolve);
    const res = await fetchImpl(url.toString(), {
      redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'image/*' }, cache: 'no-store',
    } as RequestInit);
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new UnsafeUrlError('That link did not return a photo.');
      current = new URL(location, url).toString();
      continue;
    }
    if (!res.ok) throw new UnsafeUrlError(`That link could not be opened (${res.status}).`);
    return readImage(res);
  }
  throw new UnsafeUrlError('That link redirects too many times.');
}
