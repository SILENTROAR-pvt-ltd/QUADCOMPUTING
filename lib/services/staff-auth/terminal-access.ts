import { cookies } from 'next/headers';
import { adminDb } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUser } from '@/lib/auth/verified-user';
import { resolveHostBusinesses } from '@/lib/auth/guards';
import { findVenueById, staffStillValid, type VenueRef } from './staff-login.service';
import { gatewayPath, terminalPath, type StaffRole } from './staff-roles';
import { readStaffSession, staffSecret, STAFF_COOKIE, type StaffSession } from './staff-session';

export interface TerminalActor {
  name: string;
  /** The staff role, or 'OWNER' for the venue's own host account (who may open any terminal). */
  role: StaffRole | 'OWNER';
}

export type TerminalAccess =
  | { ok: true; venue: VenueRef; actor: TerminalActor }
  | { ok: false; reason: 'NO_VENUE' }
  | { ok: false; reason: 'REDIRECT'; to: string };

/** The signed-in staff session for this venue's cookie, if it is valid and the person is still active. */
export async function currentStaff(venue: VenueRef): Promise<StaffSession | null> {
  const jar = await cookies();
  const session = await readStaffSession(jar.get(STAFF_COOKIE)?.value, staffSecret());
  if (!session || session.bid !== venue.id) return null;
  return (await staffStillValid(adminDb(), venue.id, session.sid, session.role)) ? session : null;
}

/** Whether the signed-in owner (a real host session) owns this venue. They may open every terminal. */
async function ownerOf(venue: VenueRef): Promise<boolean> {
  try {
    const supabase = await createClient();
    const user = await getVerifiedUser(supabase);
    if (!user) return false;
    const { businesses } = await resolveHostBusinesses(user.id, supabase);
    return businesses.some((b: any) => b.id === venue.id);
  } catch {
    return false;
  }
}

/**
 * Who may open `/pos/terminal?business_id=…&tab=…`. A signed-in staff member always gets exactly their own role's
 * terminal, even in a browser that also holds the owner's session: a waiter is never shown the kitchen or billing.
 * The venue's own host, with no staff sign-in, may open any terminal. Anyone else is sent to the PIN screen.
 */
export async function resolveTerminalAccess(businessId: string, role: StaffRole): Promise<TerminalAccess> {
  const venue = await findVenueById(adminDb(), businessId);
  if (!venue) return { ok: false, reason: 'NO_VENUE' };

  const staff = await currentStaff(venue);
  if (staff) {
    if (staff.role !== role) return { ok: false, reason: 'REDIRECT', to: terminalPath(venue.id, staff.role) };
    return { ok: true, venue, actor: { name: staff.name, role: staff.role } };
  }
  if (await ownerOf(venue)) return { ok: true, venue, actor: { name: 'Owner', role: 'OWNER' } };
  return { ok: false, reason: 'REDIRECT', to: gatewayPath(venue.id) };
}
