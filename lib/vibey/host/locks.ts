// Which workspace sections the co-pilot must treat as locked for this request. It mirrors the screen's gate: with a
// master PIN set, the saved locks apply until the owner's screen is unlocked. A staff sign-in never lifts a lock,
// whatever the screen claims. (Phase 4 replaces the screen's claim with a signed, short-lived unlock token.)
import { isPinSet } from '@/lib/services/security/venue-pin';
import { loadPinRow } from '@/lib/services/security/venue-pin.service';
import { readLocks } from '@/lib/services/security/protected-modules';

export function lockedModules(row: { protected_modules?: unknown } | null, pinSet: boolean, screenUnlocked: boolean, isStaff: boolean): string[] {
  if (!pinSet) return [];
  if (screenUnlocked && !isStaff) return [];
  const locks = readLocks(row?.protected_modules);
  return Object.keys(locks).filter((k) => locks[k]);
}

export async function loadLockedModules(businessId: string, screenUnlocked: boolean, isStaff: boolean): Promise<string[]> {
  const row = await loadPinRow(businessId);
  return lockedModules(row, isPinSet(row as any, 'admin'), screenUnlocked, isStaff);
}
