// One login, every property. A person signed in with their Supabase account (the same one hosts use)
// gets this property's guest record and a guest session here, created on their first visit. The
// record is linked to them by user_id and uses their platform-wide @handle, so this property's wallet
// (keyed by that handle) is theirs and no one else's.
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUser } from '@/lib/auth/verified-user';
import { ACCOUNT_COLUMNS, createSessionRow, rebindWalletToDevice, type GuestAccount } from './guest-account.service';
import { getVibersAccount } from './vibers-profile.service';

const MISSING = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);

export type ConnectResult =
  | { ok: true; account: GuestAccount; sessionToken: string }
  | { ok: false; status: number; error: string; code: 'signed_out' | 'needs_profile' | 'handle_conflict' | 'not_ready' };

/** The Supabase user signed in on this browser, verified, or null. */
export async function signedInUser(): Promise<{ id: string; email?: string } | null> {
  try {
    const user = await getVerifiedUser(await createClient() as any);
    return user ? { id: user.id, email: user.email } : null;
  } catch {
    return null;
  }
}

export async function connectVenue(db: any, userId: string, businessId: string, walletSecret: string | null): Promise<ConnectResult> {
  let profile;
  try {
    profile = await getVibersAccount(db, userId);
  } catch (e: any) {
    if (MISSING.has(e?.code)) return { ok: false, status: 503, code: 'not_ready', error: 'Vibers accounts are not set up yet. Apply migration 20261010000019.' };
    throw e;
  }
  if (!profile) return { ok: false, status: 409, code: 'needs_profile', error: 'Finish your Vibers profile to continue.' };

  const { data: mine, error: mineErr } = await db.from('guest_accounts').select(ACCOUNT_COLUMNS)
    .eq('business_id', businessId).eq('user_id', userId).maybeSingle();
  if (mineErr) throw mineErr;

  let account: GuestAccount | null = mine || null;
  if (!account) {
    const { data: sameHandle, error: sameErr } = await db.from('guest_accounts').select('id').eq('business_id', businessId).eq('handle', profile.handle).maybeSingle();
    if (sameErr) throw sameErr;
    // Someone else holds this handle at this property (an old account that was never linked to you).
    if (sameHandle) return { ok: false, status: 409, code: 'handle_conflict', error: 'Your handle belongs to another guest at this property. Please contact the venue.' };

    const { data: created, error } = await db.from('guest_accounts').insert({
      business_id: businessId, user_id: userId, handle: profile.handle, display_name: profile.display_name,
      phone: profile.phone, avatar: profile.avatar, traveller_type: profile.traveller_type, intro: profile.intro,
      pin_hash: null, pin_salt: null, last_login_at: new Date().toISOString(),
    }).select(ACCOUNT_COLUMNS).single();
    if (error) throw error;
    account = created;
  }

  // Signed in with their own account, so this device may read their wallet here.
  await rebindWalletToDevice(db, profile.handle, walletSecret);
  const sessionToken = await createSessionRow(db, (account as GuestAccount).id, businessId);
  return { ok: true, account: account as GuestAccount, sessionToken };
}
