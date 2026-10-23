// The owner's own Vibey switches, stored on the venue: vibey_guest_enabled (the guest chat on the menu) and
// vibey_host_enabled (the co-pilot in the owner app). A venue listed in VIBEY_PILOT_VENUES is on whatever these say
// (see flags.ts), so the read reports that too and the profile can say why a switched-off Vibey still shows.
import { vibeyEnabled } from './llm';

export interface VibeySwitches { guest: boolean; host: boolean; pilot: boolean; available: boolean }
export type VibeySwitchWrite = { ok: true } | { ok: false; code: 'NOT_READY' | 'FAILED'; error: string };

function isPilot(businessId: string): boolean {
  const pilots = (process.env.VIBEY_PILOT_VENUES || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return pilots.includes('*') || pilots.includes(businessId.toLowerCase());
}

/** The venue's switches as stored (off when they cannot be read), whether it is piloted, and whether Vibey runs at all. */
export async function readVibeySwitches(db: any, businessId: string): Promise<VibeySwitches> {
  const base = { pilot: isPilot(businessId), available: vibeyEnabled() };
  try {
    const { data, error } = await db.from('businesses').select('vibey_guest_enabled, vibey_host_enabled').eq('id', businessId).maybeSingle();
    if (error || !data) return { guest: false, host: false, ...base };
    return { guest: data.vibey_guest_enabled === true, host: data.vibey_host_enabled === true, ...base };
  } catch {
    return { guest: false, host: false, ...base };
  }
}

/** Saves one or both switches. A database without the columns answers NOT_READY, with what to do about it. */
export async function writeVibeySwitches(db: any, businessId: string, next: { guest?: boolean; host?: boolean }): Promise<VibeySwitchWrite> {
  const patch: Record<string, boolean> = {};
  if (typeof next.guest === 'boolean') patch.vibey_guest_enabled = next.guest;
  if (typeof next.host === 'boolean') patch.vibey_host_enabled = next.host;
  if (Object.keys(patch).length === 0) return { ok: false, code: 'FAILED', error: 'Choose on or off.' };
  const { error } = await db.from('businesses').update(patch).eq('id', businessId);
  if (!error) return { ok: true };
  const missing = error.code === '42703' || error.code === 'PGRST204' || /vibey_/i.test(String(error.message || ''));
  if (missing) return { ok: false, code: 'NOT_READY', error: 'Vibey needs one database update first (supabase/apply-pending-20261018-vibey.sql).' };
  return { ok: false, code: 'FAILED', error: 'The setting could not be saved. Please try again.' };
}
