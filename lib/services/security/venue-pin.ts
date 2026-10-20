import { hashPin, verifyPin } from '@/lib/auth/guest-auth';

// Venue PINs: the master PIN (owner) and the staff POS PIN. Stored only as a salted scrypt hash
// in businesses.<kind>_pin_hash ("scrypt:<salt>:<hash>"). Older rows kept the PIN in plain text
// (businesses.<kind>_pin); those still verify once and are then upgraded to a hash.

export type PinKind = 'admin' | 'staff';
export interface PinRow { admin_pin?: unknown; staff_pin?: unknown; admin_pin_hash?: unknown; staff_pin_hash?: unknown }

const PREFIX = 'scrypt:';

export { pinProblem } from './pin-rules';

export async function encodePin(pin: string): Promise<string> {
  const h = await hashPin(pin);
  return `${PREFIX}${h.salt}:${h.hash}`;
}

const legacy = (row: PinRow, kind: PinKind) => {
  const v = row[`${kind}_pin`];
  const s = v === null || v === undefined ? '' : String(v).trim();
  // '0000' was the column default, not a PIN an owner chose (pinProblem rejects it), so it is never a set PIN.
  return s === '' || s === '0000' ? null : s;
};
const hashed = (row: PinRow, kind: PinKind) => {
  const v = row[`${kind}_pin_hash`];
  return typeof v === 'string' && v.startsWith(PREFIX) ? v : null;
};

export const isPinSet = (row: PinRow | null | undefined, kind: PinKind) => Boolean(row && (hashed(row, kind) || legacy(row, kind)));

/** Whether the PIN matches, and whether the stored form is old plain text that should be upgraded. */
export async function checkPin(row: PinRow, kind: PinKind, pin: unknown): Promise<{ ok: boolean; upgrade: boolean }> {
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return { ok: false, upgrade: false };
  const h = hashed(row, kind);
  if (h) {
    const [salt, hash] = h.slice(PREFIX.length).split(':');
    return { ok: Boolean(salt && hash) && (await verifyPin(pin, { salt, hash })), upgrade: false };
  }
  const plain = legacy(row, kind);
  return { ok: plain !== null && plain === pin, upgrade: plain !== null && plain === pin };
}

/** Columns to write so the PIN is stored only as a hash (or removed with null). */
export async function pinColumns(kind: PinKind, pin: string | null): Promise<Record<string, string | null>> {
  return { [`${kind}_pin_hash`]: pin ? await encodePin(pin) : null, [`${kind}_pin`]: null };
}
