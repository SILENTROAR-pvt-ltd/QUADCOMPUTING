// One login, every property. A person signed in with their Supabase account (the same one hosts use)
// gets this property's guest record and a guest session here, created on their first visit. The
// record is linked to them by user_id and uses their platform-wide @handle, so this property's wallet
// (keyed by that handle) is theirs and no one else's.
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUser } from '@/lib/auth/verified-user';
import { ACCOUNT_COLUMNS, createSessionRow, rebindWalletToDevice, type GuestAccount } from './guest-account.service';
import { getVibersAccount } from './vibers-profile.service';
import type { PinHash } from '@/lib/auth/guest-auth';

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

/** The PIN reference for a person: the guest record (any venue) that holds their PIN, with its sign-in lockout state. */
export interface PinReference extends PinHash { id: string; failed_attempts: number; locked_until: string | null }

/**
 * The PIN this person already set at another venue, if any. One handle and one PIN work at every property, so a new
 * venue's guest record starts with it. Oldest record first, so the same one is always the reference.
 */
export async function pinFromOtherVenue(db: any, userId: string): Promise<PinReference | null> {
  const { data, error } = await db.from('guest_accounts').select('id, pin_hash, pin_salt, failed_attempts, locked_until')
    .eq('user_id', userId).not('pin_hash', 'is', null).order('created_at', { ascending: true }).limit(1);
  if (error) throw error;
  const row = (data || [])[0];
  return row?.pin_hash && row?.pin_salt
    ? { id: row.id, hash: row.pin_hash, salt: row.pin_salt, failed_attempts: row.failed_attempts || 0, locked_until: row.locked_until || null }
    : null;
}

/** `pin` is a new PIN chosen just now (profile step). Without one, a PIN set at another venue is carried over. */
export async function connectVenue(db: any, userId: string, businessId: string, walletSecret: string | null, pin?: PinHash | null): Promise<ConnectResult> {
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
  // A record without a PIN gets the one just chosen, or the one this person already uses at another venue.
  if (account && !account.pin_hash) {
    const chosen = pin ?? await pinFromOtherVenue(db, userId);
    if (chosen) {
      const { error: pinErr } = await db.from('guest_accounts').update({ pin_hash: chosen.hash, pin_salt: chosen.salt }).eq('id', account.id);
      if (pinErr) throw pinErr;
      account = { ...account, pin_hash: chosen.hash, pin_salt: chosen.salt };
    }
  }  if (!account) {
    const { data: sameHandle, error: sameErr } = await db.from('guest_accounts').select('id').eq('business_id', businessId).eq('handle', profile.handle).maybeSingle();
    if (sameErr) throw sameErr;
    // Someone else holds this handle at this property (an old account that was never linked to you).
    if (sameHandle) return { ok: false, status: 409, code: 'handle_conflict', error: 'Your handle belongs to another guest at this property. Please contact the venue.' };

    const carried = pin ?? await pinFromOtherVenue(db, userId);
    const { data: created, error } = await db.from('guest_accounts').insert({
      business_id: businessId, user_id: userId, handle: profile.handle, display_name: profile.display_name,
      phone: profile.phone, avatar: profile.avatar, traveller_type: profile.traveller_type, intro: profile.intro,
      pin_hash: carried?.hash ?? null, pin_salt: carried?.salt ?? null, last_login_at: new Date().toISOString(),
    }).select(ACCOUNT_COLUMNS).single();
    if (error) throw error;
    account = created;
  }

  // Signed in with their own account, so this device may read their wallet here.
  await rebindWalletToDevice(db, profile.handle, walletSecret);
  const sessionToken = await createSessionRow(db, (account as GuestAccount).id, businessId);
  return { ok: true, account: account as GuestAccount, sessionToken };
}
