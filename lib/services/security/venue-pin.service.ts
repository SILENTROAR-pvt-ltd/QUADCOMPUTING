import { adminDb } from '@/lib/supabase/admin';
import { checkPin, isPinSet, pinColumns, pinProblem, type PinKind, type PinRow } from './venue-pin';

const PIN_COLUMNS = 'id, admin_pin, staff_pin, admin_pin_hash, staff_pin_hash, protected_modules';

/** The venue's PIN columns, read with the service role (they are never sent to the browser). */
export async function loadPinRow(businessId: string): Promise<(PinRow & { id: string; protected_modules?: unknown }) | null> {
  const { data, error } = await adminDb().from('businesses').select(PIN_COLUMNS).eq('id', businessId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Replaces an old plain-text PIN with its hash after it was entered correctly. */
export async function upgradePin(businessId: string, kind: PinKind, pin: string) {
  const { error } = await adminDb().from('businesses').update(await pinColumns(kind, pin)).eq('id', businessId);
  if (error) console.warn('[venue-pin] could not upgrade a plain-text PIN', error.message);
}

type SetResult = { ok: true; isAdminPinSet: boolean; isStaffPinSet: boolean } | { ok: false; status: number; error: string };

/**
 * Sets, changes or removes a PIN. Changing or removing the master PIN needs the current master
 * PIN; the staff PIN is managed with the master PIN when one is set. The two must differ.
 */
export async function setVenuePin(businessId: string, kind: PinKind, next: string | null, current: unknown): Promise<SetResult> {
  const row = await loadPinRow(businessId);
  if (!row) return { ok: false, status: 404, error: 'Venue not found.' };
  if (next !== null) {
    const problem = pinProblem(next);
    if (problem) return { ok: false, status: 400, error: problem };
  }

  if (isPinSet(row, 'admin')) {
    const master = await checkPin(row, 'admin', current);
    if (!master.ok) return { ok: false, status: 401, error: 'The current master PIN is not correct.' };
  }
  const other: PinKind = kind === 'admin' ? 'staff' : 'admin';
  if (next !== null && (await checkPin(row, other, next)).ok) {
    return { ok: false, status: 400, error: 'Use different PINs for the master and staff locks.' };
  }

  const { error } = await adminDb().from('businesses').update(await pinColumns(kind, next)).eq('id', businessId);
  if (error) throw error;
  const fresh = await loadPinRow(businessId);
  return { ok: true, isAdminPinSet: isPinSet(fresh, 'admin'), isStaffPinSet: isPinSet(fresh, 'staff') };
}
