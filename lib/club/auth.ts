// Who is calling a Club route. One login for everything: the Supabase account QC hosts and guests
// use. Club membership is a viber_profiles row; staff rights come from club_staff (or the QC
// super-admin flag, so the platform owner is a Club super admin too).
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUser } from '@/lib/auth/verified-user';
import { fail, must } from './http';
import type { ViberProfile } from './types';

export type StaffRole = 'club_admin' | 'super_admin';
export interface SessionUser { id: string; email?: string; superAdmin: boolean }

export const PROFILE_COLUMNS =
  'user_id, viber_id, alias, alias_masked, dob, generation, city, state, country, account_type, business_name, phone, phone_verified_at, vibe_line, avatar_url, status, pass_number, campaign_source, review_note, reviewed_at, muted_until, shadow_banned, created_at';

export async function sessionUser(): Promise<SessionUser | null> {
  try {
    const user = await getVerifiedUser((await createClient()) as any);
    if (!user) return null;
    return { id: user.id, email: user.email, superAdmin: user.app_metadata?.role === 'super_admin' };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await sessionUser();
  if (!user) fail(401, 'Sign in with your Vibers account first.', 'signed_out');
  return user as SessionUser;
}

export async function loadProfile(db: any, userId: string): Promise<ViberProfile | null> {
  return must(await db.from('viber_profiles').select(PROFILE_COLUMNS).eq('user_id', userId).maybeSingle()) || null;
}

/** An approved member. `speak` also refuses a muted member (posting, chatting, reacting). */
export async function requireMember(db: any, opts: { speak?: boolean } = {}) {
  const user = await requireUser();
  const profile = await loadProfile(db, user.id);
  if (!profile) fail(403, 'Apply to Vibers Club first.', 'apply_first');
  if (profile!.status !== 'approved') fail(403, 'Your Vibers Club application is not approved yet.', 'not_approved');
  if (opts.speak && profile!.muted_until && new Date(profile!.muted_until).getTime() > Date.now()) {
    fail(403, 'You are muted for now. Please try again later.', 'muted');
  }
  return { user, profile: profile as ViberProfile };
}

export async function staffRole(db: any, user: SessionUser): Promise<StaffRole | null> {
  if (user.superAdmin) return 'super_admin';
  const row = must(await db.from('club_staff').select('role').eq('user_id', user.id).maybeSingle()) as { role: StaffRole } | null;
  return row?.role ?? null;
}

export async function requireStaff(db: any, needed: StaffRole = 'club_admin') {
  const user = await requireUser();
  const role = await staffRole(db, user);
  if (!role) fail(403, 'Club staff only.', 'forbidden');
  if (needed === 'super_admin' && role !== 'super_admin') fail(403, 'Super admin only.', 'forbidden');
  return { user, role: role as StaffRole };
}
