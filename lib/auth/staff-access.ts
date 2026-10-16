import { adminDb } from '@/lib/supabase/admin';
import { staffMayCall } from '@/lib/services/staff-auth/staff-roles';
import { readStaffSession, staffSecret, staffTokenFromCookieHeader, type StaffSession } from '@/lib/services/staff-auth/staff-session';
import { staffStillValid } from '@/lib/services/staff-auth/staff-login.service';

// A staff member who is switched off, or whose role changes, loses access within this many seconds.
const FRESH_MS = 10_000;
const checked = new Map<string, { ok: boolean; at: number }>();

/** Whether a staff member is still active in the role the token says, checked at most every few seconds. */
async function stillValid(session: StaffSession): Promise<boolean> {
  const key = `${session.bid}:${session.sid}:${session.role}`;
  const hit = checked.get(key);
  const now = Date.now();
  if (hit && now - hit.at < FRESH_MS) return hit.ok;
  const ok = await staffStillValid(adminDb(), session.bid, session.sid, session.role).catch(() => false);
  checked.set(key, { ok, at: now });
  if (checked.size > 500) checked.clear();
  return ok;
}

/**
 * The signed-in staff session on a request: signed, unexpired and the person still active in that role; otherwise null.
 * It does not look at the path. A staff sign-in outranks any owner session in the same browser, so the caller must
 * hold the request to `staffMayCall` rather than fall back to the owner.
 */
export async function staffFromRequest(request: Request): Promise<StaffSession | null> {
  const session = await readStaffSession(staffTokenFromCookieHeader(request.headers.get('cookie')), staffSecret());
  if (!session) return null;
  return (await stillValid(session)) ? session : null;
}

/** Whether this staff session's role may make this request to the host API. */
export function staffMayMake(session: StaffSession, request: Request): boolean {
  try { return staffMayCall(session.role, request.method, new URL(request.url).pathname); } catch { return false; }
}

/** A host-shaped user for a staff member. Its id is not a UUID on purpose: nothing may write it into a user column. */
export function staffUser(session: StaffSession) {
  return {
    id: `staff:${session.sid}`,
    aud: 'authenticated',
    role: 'authenticated',
    email: undefined,
    app_metadata: { role: 'staff', staff_role: session.role },
    user_metadata: { name: session.name },
    created_at: '',
  } as any;
}
