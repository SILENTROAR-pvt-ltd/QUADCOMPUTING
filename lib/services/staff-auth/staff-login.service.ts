import { encodePin } from '@/lib/services/security/venue-pin';
import { verifyPin } from '@/lib/auth/guest-auth';
import { asStaffRole, type StaffRole } from './staff-roles';

const PREFIX = 'scrypt:';
export const MAX_PIN_FAILURES = 5;
export const LOCK_MINUTES = 5;

export interface VenueRef { id: string; name: string }
export interface LoginStaff { id: string; name: string; role: StaffRole }

export const isFourDigitPin = (pin: unknown): pin is string => typeof pin === 'string' && /^\d{4}$/.test(pin);

/** A PIN's stored form, for staff_profiles.pin_hash. */
export const hashStaffPin = (pin: string) => encodePin(pin);

/** Whether `pin` matches a stored "scrypt:<salt>:<hash>". Anything else (missing, plain text) never matches. */
export async function matchesStoredPin(stored: unknown, pin: string): Promise<boolean> {
  if (typeof stored !== 'string' || !stored.startsWith(PREFIX)) return false;
  const [salt, hash] = stored.slice(PREFIX.length).split(':');
  return Boolean(salt && hash) && (await verifyPin(pin, { salt, hash }));
}

/** The venue behind a /pos/<slug> link, or null. Looked up with the service client: the page has no signed-in user. */
export async function findVenueBySlug(db: any, slug: string): Promise<VenueRef | null> {
  const clean = String(slug || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(clean)) return null;
  // All columns, so a venue database that names the venue `name` or `business_name` (or both) still resolves.
  const { data, error } = await db.from('businesses').select('*').eq('slug', clean).maybeSingle();
  if (error || !data?.id) return null;
  return { id: String(data.id), name: String(data.business_name || data.name || 'Venue') };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isVenueId = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

/** The venue behind a `business_id` in a staff link, or null. Only a well-formed id is ever sent to the database. */
export async function findVenueById(db: any, businessId: unknown): Promise<VenueRef | null> {
  if (!isVenueId(businessId)) return null;
  const { data, error } = await db.from('businesses').select('*').eq('id', businessId.toLowerCase()).maybeSingle();
  if (error || !data?.id) return null;
  return { id: String(data.id), name: String(data.business_name || data.name || 'Venue') };
}

/** Who can sign in at this venue: active, with a PIN set and one of the three roles. Names and roles only. */
export async function listLoginStaff(db: any, businessId: string): Promise<LoginStaff[]> {
  const { data, error } = await db.from('staff_profiles')
    .select('id, name, role, status, is_pos_active, pin_hash')
    .eq('business_id', businessId).eq('is_pos_active', true).not('pin_hash', 'is', null).order('name');
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((r: any) => {
    const role = asStaffRole(r.role);
    return role && String(r.status || 'ACTIVE').toUpperCase() !== 'INACTIVE' ? [{ id: String(r.id), name: String(r.name), role }] : [];
  });
}

export type PinOutcome =
  | { ok: true; staff: LoginStaff }
  | { ok: false; code: 'UNKNOWN' | 'WRONG' | 'LOCKED'; retryAfterSeconds?: number; triesLeft?: number };

/**
 * Checks a staff member's PIN. Five wrong tries in a row lock that person out for five minutes (the lock is on them,
 * not the venue, so one person guessing cannot lock out the rest). A right PIN clears the count.
 */
export async function checkStaffPin(db: any, businessId: string, staffId: string, pin: string, now = Date.now()): Promise<PinOutcome> {
  const { data: row, error } = await db.from('staff_profiles')
    .select('id, name, role, status, is_pos_active, pin_hash, pin_failures, pin_locked_until')
    .eq('id', staffId).eq('business_id', businessId).maybeSingle();
  const role = asStaffRole(row?.role);
  if (error || !row || !role || !row.is_pos_active || String(row.status || 'ACTIVE').toUpperCase() === 'INACTIVE' || !row.pin_hash) {
    return { ok: false, code: 'UNKNOWN' };
  }

  const lockedUntil = row.pin_locked_until ? Date.parse(row.pin_locked_until) : 0;
  if (lockedUntil > now) return { ok: false, code: 'LOCKED', retryAfterSeconds: Math.ceil((lockedUntil - now) / 1000) };

  if (await matchesStoredPin(row.pin_hash, pin)) {
    await db.from('staff_profiles').update({ pin_failures: 0, pin_locked_until: null, last_login_at: new Date(now).toISOString() }).eq('id', staffId);
    return { ok: true, staff: { id: String(row.id), name: String(row.name), role } };
  }

  const failures = (Number(row.pin_failures) || 0) + 1;
  if (failures >= MAX_PIN_FAILURES) {
    await db.from('staff_profiles').update({ pin_failures: 0, pin_locked_until: new Date(now + LOCK_MINUTES * 60_000).toISOString() }).eq('id', staffId);
    return { ok: false, code: 'LOCKED', retryAfterSeconds: LOCK_MINUTES * 60 };
  }
  await db.from('staff_profiles').update({ pin_failures: failures }).eq('id', staffId);
  return { ok: false, code: 'WRONG', triesLeft: MAX_PIN_FAILURES - failures };
}

/** Whether a signed-in staff member still has access: still active, same venue, same role. Used to cut a session short. */
export async function staffStillValid(db: any, businessId: string, staffId: string, role: StaffRole): Promise<boolean> {
  const { data, error } = await db.from('staff_profiles').select('id, role, status, is_pos_active, pin_hash').eq('id', staffId).eq('business_id', businessId).maybeSingle();
  if (error || !data) return false;
  return Boolean(data.is_pos_active) && Boolean(data.pin_hash) && String(data.status || 'ACTIVE').toUpperCase() !== 'INACTIVE' && asStaffRole(data.role) === role;
}
