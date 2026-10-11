// A person's Vibers profile: one platform-wide @handle, name and phone, tied to their Supabase account
// (the same account hosts sign in with). Wallets stay per property and are keyed by that @handle, so a
// handle may only be taken by someone who can show it is theirs:
//   - nobody else's profile has it;
//   - an old @handle + PIN account with it is linked only after its PIN is proven here;
//   - a wallet that already exists under it is claimed only by the device that holds its claim.
import { isValidPin, nextFailureState, normalizeDisplayName, normalizeHandle, normalizePhone, pinLockState, verifyPin } from '@/lib/auth/guest-auth';
import { authorizeGuestIdentifiers } from '@/lib/services/wallet/wallet-claim.service';
import { rebindWalletToDevice } from './guest-account.service';
import { isTravellerType, normalizeIntro } from '@/lib/guest/traveller-types';

export interface VibersAccount {
  user_id: string; handle: string; display_name: string; phone: string | null;
  avatar: string; traveller_type: string | null; intro: string | null;
}
export const VIBERS_COLUMNS = 'user_id, handle, display_name, phone, avatar, traveller_type, intro';

export type ProfileResult =
  | { ok: true; profile: VibersAccount }
  | { ok: false; status: number; error: string; code?: 'legacy_pin_required' | 'handle_taken' };

export async function getVibersAccount(db: any, userId: string): Promise<VibersAccount | null> {
  const { data, error } = await db.from('vibers_accounts').select(VIBERS_COLUMNS).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data || null;
}

interface Input { userId: string; rawHandle: unknown; rawName: unknown; rawPhone: unknown; travellerType?: unknown; intro?: unknown; legacyPin?: unknown; walletSecret: string | null }

const TAKEN: ProfileResult = { ok: false, status: 409, code: 'handle_taken', error: 'That handle is already in use. Please choose another.' };

/** Old @handle + PIN records with this handle: all must open with the PIN given, or nothing is linked. */
async function provePin(db: any, rows: any[], pin: unknown): Promise<ProfileResult | null> {
  if (!isValidPin(pin)) return { ok: false, status: 401, code: 'legacy_pin_required', error: 'You have used this handle before. Enter that 6-digit PIN to bring your wallet with you.' };
  for (const row of rows) {
    if (pinLockState(row.locked_until).locked) return { ok: false, status: 423, error: 'Too many wrong PINs. Try again later.' };
    if (!row.pin_hash || !(await verifyPin(pin as string, { hash: row.pin_hash, salt: row.pin_salt }))) {
      await db.from('guest_accounts').update(nextFailureState(row.failed_attempts || 0)).eq('id', row.id);
      return { ok: false, status: 401, code: 'legacy_pin_required', error: 'That PIN is not right for this handle.' };
    }
  }
  return null;
}

export async function createVibersProfile(db: any, input: Input): Promise<ProfileResult> {
  const existing = await getVibersAccount(db, input.userId);
  if (existing) return { ok: true, profile: existing };

  const handle = normalizeHandle(input.rawHandle);
  const displayName = normalizeDisplayName(input.rawName);
  const phone = normalizePhone(input.rawPhone);
  if (!handle) return { ok: false, status: 400, error: 'Choose a handle of 2–30 letters, numbers or underscores.' };
  if (!displayName) return { ok: false, status: 400, error: 'Enter your name.' };
  if (!phone) return { ok: false, status: 400, error: 'Enter a valid mobile number.' };

  const { data: other, error: otherErr } = await db.from('vibers_accounts').select('user_id').eq('handle', handle).maybeSingle();
  if (otherErr) throw otherErr;
  if (other) return TAKEN;

  const { data: legacy, error: legacyErr } = await db.from('guest_accounts')
    .select('id, user_id, pin_hash, pin_salt, failed_attempts, locked_until').eq('handle', handle);
  if (legacyErr) throw legacyErr;
  if ((legacy || []).some((r: any) => r.user_id && r.user_id !== input.userId)) return TAKEN;
  const unlinked = (legacy || []).filter((r: any) => !r.user_id);

  if (unlinked.length > 0) {
    const refused = await provePin(db, unlinked, input.legacyPin);
    if (refused) return refused;
    await rebindWalletToDevice(db, handle, input.walletSecret);
  } else {
    // Look first, claim second: a never-claimed handle that already holds wallet money has no proven
    // owner, so it is refused rather than handed to whoever registers it first.
    const claim = await authorizeGuestIdentifiers(db, [handle], input.walletSecret);
    if (claim.taken.length > 0) return TAKEN;
    if (claim.owned.length === 0) {
      const { data: wallet, error: walletErr } = await db.from('guest_wallets').select('id').eq('guest_id', handle).limit(1).maybeSingle();
      if (walletErr) throw walletErr;
      if (wallet) return TAKEN;
      if (input.walletSecret) await authorizeGuestIdentifiers(db, [handle], input.walletSecret, { claim: true });
    }
  }

  const row = {
    user_id: input.userId, handle, display_name: displayName, phone, avatar: '☕',
    traveller_type: isTravellerType(input.travellerType) ? input.travellerType : null, intro: normalizeIntro(input.intro),
  };
  const { data: profile, error } = await db.from('vibers_accounts').insert(row).select(VIBERS_COLUMNS).single();
  if (error) { if (error.code === '23505') return TAKEN; throw error; }
  if (unlinked.length > 0) {
    const { error: linkErr } = await db.from('guest_accounts').update({ user_id: input.userId }).in('id', unlinked.map((r: any) => r.id));
    if (linkErr) throw linkErr;
  }
  return { ok: true, profile };
}
