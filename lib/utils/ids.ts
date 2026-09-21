import type { OwnerCafeId } from '@/types/host';
import type { QrCodeHash } from '@/types/branch';

export const OWNER_CAFE_ID_PATTERN = /^HOST-CF-[0-9A-F]{4}-[0-9A-Z]{4}$/;
export const isOwnerCafeId = (value: string): value is OwnerCafeId => OWNER_CAFE_ID_PATTERN.test(value);

export function generateUniqueOwnerCafeId(nowMs = Date.now()): OwnerCafeId {
  const bytes = new Uint8Array(2);
  globalThis.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  const time = Math.floor(nowMs / 1000).toString(36).toUpperCase().slice(-4).padStart(4, '0');
  return `HOST-CF-${hex}-${time}` as OwnerCafeId;
}

export const generateOwnerCafeId = generateUniqueOwnerCafeId;

export function createEntityId(prefix: 'brn' | 'itm' | 'add'): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, 10)}`;
}

export async function generateQrCodeHash(ownerId: OwnerCafeId, branchId: string): Promise<QrCodeHash> {
  const data = new TextEncoder().encode(`${ownerId}::${branchId}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return hex as QrCodeHash;
}
