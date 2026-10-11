import {
  hashPin,
  hashSessionToken,
  isValidPin,
  nextFailureState,
  newSessionToken,
  normalizeDisplayName,
  normalizeHandle,
  normalizePhone,
  pinLockState,
  readSessionCookie,
  verifyPin,
  GUEST_SESSION_TTL_DAYS,
} from '@/lib/auth/guest-auth';
import { authorizeGuestIdentifiers, hashWalletSecret, normalizeGuestKey } from '@/lib/services/wallet/wallet-claim.service';
import { isTravellerType, normalizeIntro } from '@/lib/guest/traveller-types';
import { isAvatarOption } from '@/lib/guest/avatar-options';
import { avatarPublicUrl } from '@/lib/services/guest-auth/guest-avatar.service';

export interface GuestAccount {
  id: string;
  business_id: string;
  handle: string;
  display_name: string;
  phone: string | null;
  avatar: string;
  photo_path: string | null;
  traveller_type: string | null;
  intro: string | null;
  /** Null for records linked to a Vibers account: those sign in with the account password. */
  pin_hash: string | null;
  pin_salt: string | null;
  failed_attempts: number;
  locked_until: string | null;
}

/** What the browser is allowed to know about the signed-in guest. */
export interface GuestAccountSummary {
  handle: string;
  display_name: string;
  phone_masked: string | null;
  avatar: string;
  /** Public URL of the uploaded photo, when there is one. The emoji avatar is the fallback. */
  avatar_url: string | null;
  traveller_type: string | null;
  intro: string | null;
  /** True only for old @handle + PIN records; linked accounts use their account password instead. */
  has_pin: boolean;
}

export type GuestAuthResult =
  | { ok: true; account: GuestAccount; sessionToken: string; walletRebound: boolean }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number };

export function summarize(account: GuestAccount): GuestAccountSummary {
  const digits = account.phone || '';
  return {
    handle: account.handle,
    display_name: account.display_name,
    phone_masked: digits ? `•••••${digits.slice(-2)}` : null,
    avatar: account.avatar || '☕',
    avatar_url: account.photo_path ? avatarPublicUrl(account.photo_path) : null,
    traveller_type: isTravellerType(account.traveller_type) ? account.traveller_type : null,
    intro: normalizeIntro(account.intro),
    has_pin: Boolean(account.pin_hash && account.pin_salt),
  };
}

export const ACCOUNT_COLUMNS = 'id, business_id, handle, display_name, phone, avatar, photo_path, traveller_type, intro, pin_hash, pin_salt, failed_attempts, locked_until';

async function findAccount(db: any, businessId: string, handle: string): Promise<GuestAccount | null> {
  const { data, error } = await db
    .from('guest_accounts')
    .select(ACCOUNT_COLUMNS)
    .eq('business_id', businessId)
    .eq('handle', handle)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function createSessionRow(db: any, accountId: string, businessId: string): Promise<string> {
  const token = newSessionToken();
  const expires = new Date(Date.now() + GUEST_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await db.from('guest_auth_sessions').insert({
    account_id: accountId,
    business_id: businessId,
    token_hash: hashSessionToken(token),
    expires_at: expires,
  });
  if (error) throw error;
  return token;
}

/**
 * Points the handle's wallet ownership at the device that just proved the PIN,
 * so the wallet can be read there. Only ever called after a verified PIN.
 */
export async function rebindWalletToDevice(db: any, handle: string, walletSecret: string | null): Promise<boolean> {
  if (!walletSecret) return false;
  const { error } = await db
    .from('guest_wallet_claims')
    .upsert(
      [{ guest_key: normalizeGuestKey(handle), secret_hash: hashWalletSecret(walletSecret) }],
      { onConflict: 'guest_key' }
    );
  if (error) throw error;
  return true;
}

export async function signUp(args: {
  db: any;
  businessId: string;
  rawHandle: unknown;
  rawName: unknown;
  rawPhone: unknown;
  pin: unknown;
  avatar?: unknown;
  travellerType?: unknown;
  intro?: unknown;
  walletSecret: string | null;
}): Promise<GuestAuthResult> {
  const { db, businessId, walletSecret } = args;
  const handle = normalizeHandle(args.rawHandle);
  const displayName = normalizeDisplayName(args.rawName);
  const phone = normalizePhone(args.rawPhone);
  if (!handle) return { ok: false, status: 400, error: 'Choose a handle of 2–30 letters, numbers or underscores.' };
  if (!displayName) return { ok: false, status: 400, error: 'Enter your name.' };
  if (!phone) return { ok: false, status: 400, error: 'Enter a valid mobile number.' };
  if (!isValidPin(args.pin)) return { ok: false, status: 400, error: 'Your PIN must be exactly 6 digits.' };
  if (!walletSecret) return { ok: false, status: 400, error: 'This device could not be verified. Reload the page and try again.' };

  if (await findAccount(db, businessId, handle)) {
    return { ok: false, status: 409, error: 'That handle is already taken at this venue.' };
  }

  // The wallet claim decides whether this handle is free anywhere on the platform.
  // Sign-up is the one place a handle is claimed for this device.
  const claim = await authorizeGuestIdentifiers(db, [handle], walletSecret, { claim: true });
  if (claim.taken.length > 0) {
    return { ok: false, status: 409, error: 'That handle is already in use. Please choose another.' };
  }

  const stored = await hashPin(args.pin);
  const avatar = typeof args.avatar === 'string' && args.avatar.length <= 4 ? args.avatar : '☕';
  const { data, error } = await db
    .from('guest_accounts')
    .insert({
      business_id: businessId,
      handle,
      display_name: displayName,
      phone,
      avatar,
      pin_hash: stored.hash,
      pin_salt: stored.salt,
      traveller_type: isTravellerType(args.travellerType) ? args.travellerType : null,
      intro: normalizeIntro(args.intro),
      last_login_at: new Date().toISOString(),
    })
    .select(ACCOUNT_COLUMNS)
    .single();
  if (error) {
    if (error.code === '23505') return { ok: false, status: 409, error: 'That handle is already taken at this venue.' };
    throw error;
  }

  const sessionToken = await createSessionRow(db, data.id, businessId);
  return { ok: true, account: data, sessionToken, walletRebound: true };
}

export async function signIn(args: {
  db: any;
  businessId: string;
  rawHandle: unknown;
  pin: unknown;
  walletSecret: string | null;
  now?: Date;
}): Promise<GuestAuthResult> {
  const { db, businessId, walletSecret } = args;
  const now = args.now ?? new Date();
  const handle = normalizeHandle(args.rawHandle);
  if (!handle || !isValidPin(args.pin)) {
    return { ok: false, status: 401, error: 'Handle or PIN is incorrect.' };
  }

  const account = await findAccount(db, businessId, handle);
  if (!account) {
    return { ok: false, status: 401, error: 'Handle or PIN is incorrect.' };
  }

  const lock = pinLockState(account.locked_until, now);
  if (lock.locked) {
    return {
      ok: false,
      status: 423,
      error: `Too many wrong PINs. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} min.`,
      retryAfterSeconds: lock.retryAfterSeconds,
    };
  }

  if (!account.pin_hash || !account.pin_salt) {
    return { ok: false, status: 401, error: 'Sign in with your Vibers account email and password.' };
  }
  const valid = await verifyPin(args.pin as string, { hash: account.pin_hash, salt: account.pin_salt });
  if (!valid) {
    const next = nextFailureState(account.failed_attempts, now);
    await db.from('guest_accounts').update(next).eq('id', account.id);
    return { ok: false, status: 401, error: 'Handle or PIN is incorrect.' };
  }

  await db
    .from('guest_accounts')
    .update({ failed_attempts: 0, locked_until: null, last_login_at: now.toISOString() })
    .eq('id', account.id);

  const walletRebound = await rebindWalletToDevice(db, handle, walletSecret);
  const sessionToken = await createSessionRow(db, account.id, businessId);
  return { ok: true, account: { ...account, failed_attempts: 0, locked_until: null }, sessionToken, walletRebound };
}

/** The guest account behind this request's cookie, only for the venue it was issued for. */
export async function accountForRequest(db: any, request: Request, businessId: string): Promise<GuestAccount | null> {
  const token = readSessionCookie(request.headers.get('cookie'));
  if (!token) return null;
  const { data: session, error } = await db
    .from('guest_auth_sessions')
    .select('account_id, expires_at')
    .eq('token_hash', hashSessionToken(token))
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw error;
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) return null;

  const { data: account, error: accErr } = await db
    .from('guest_accounts')
    .select(ACCOUNT_COLUMNS)
    .eq('id', session.account_id)
    .maybeSingle();
  if (accErr) throw accErr;
  return account || null;
}

export interface ProfileChanges {
  name?: unknown;
  traveller_type?: unknown;
  intro?: unknown;
  /** One of the emoji avatars. Choosing one replaces any uploaded photo. */
  avatar?: unknown;
}

export type ProfileResult =
  | { ok: true; account: GuestAccount; removed_photo_path: string | null }
  | { ok: false; status: number; error: string };

/**
 * Edits the guest's own profile at this venue: name, traveller type and intro. The handle and PIN
 * are not editable here: the handle is the wallet's identity and the PIN is changed by a separate step.
 * Only the fields sent are changed. An empty traveller type clears it.
 */
export async function updateGuestProfile(db: any, account: GuestAccount, changes: ProfileChanges): Promise<ProfileResult> {
  const patch: Record<string, unknown> = {};

  if (changes.name !== undefined) {
    const name = normalizeDisplayName(changes.name);
    if (!name) return { ok: false, status: 400, error: 'Enter your name.' };
    patch.display_name = name;
  }

  if (changes.traveller_type !== undefined) {
    if (changes.traveller_type === null || changes.traveller_type === '') {
      patch.traveller_type = null;
    } else if (isTravellerType(changes.traveller_type)) {
      patch.traveller_type = changes.traveller_type;
    } else {
      return { ok: false, status: 400, error: 'Choose a traveller type from the list.' };
    }
  }

  if (changes.intro !== undefined) patch.intro = normalizeIntro(changes.intro);

  // An emoji avatar replaces the photo; the photo file is removed by the caller after this saves.
  const dropsPhoto = changes.avatar !== undefined && account.photo_path !== null;
  if (changes.avatar !== undefined) {
    if (!isAvatarOption(changes.avatar)) return { ok: false, status: 400, error: 'Choose an avatar from the list.' };
    patch.avatar = changes.avatar;
    patch.photo_path = null;
  }

  if (Object.keys(patch).length === 0) return { ok: true, account, removed_photo_path: null };

  const { data, error } = await db
    .from('guest_accounts')
    .update(patch)
    .eq('id', account.id)
    .select(ACCOUNT_COLUMNS)
    .single();
  if (error) throw error;
  return { ok: true, account: data, removed_photo_path: dropsPhoto ? account.photo_path : null };
}

export type PinChangeResult =
  | { ok: true; sessionToken: string }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number };

/**
 * Changes the signed-in guest's PIN. The current PIN is required, and wrong guesses count toward the
 * same lockout as sign-in. On success every other session for the account is ended, and this device
 * gets a fresh session, so a stolen phone or an old session stops working.
 */
export async function changeGuestPin(
  db: any,
  account: GuestAccount,
  input: { currentPin: unknown; newPin: unknown },
  now: Date = new Date()
): Promise<PinChangeResult> {
  const lock = pinLockState(account.locked_until, now);
  if (lock.locked) {
    return {
      ok: false,
      status: 423,
      error: `Too many wrong PINs. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} min.`,
      retryAfterSeconds: lock.retryAfterSeconds,
    };
  }
  if (!isValidPin(input.currentPin)) return { ok: false, status: 400, error: 'Enter your current PIN.' };
  if (!isValidPin(input.newPin)) return { ok: false, status: 400, error: 'Your new PIN must be exactly 6 digits.' };
  if (input.currentPin === input.newPin) return { ok: false, status: 400, error: 'Choose a PIN different from your current one.' };

  if (!account.pin_hash || !account.pin_salt) {
    return { ok: false, status: 400, error: 'Your account has no PIN. You sign in with your account password.' };
  }
  const valid = await verifyPin(input.currentPin as string, { hash: account.pin_hash, salt: account.pin_salt });
  if (!valid) {
    await db.from('guest_accounts').update(nextFailureState(account.failed_attempts, now)).eq('id', account.id);
    return { ok: false, status: 401, error: 'Your current PIN is incorrect.' };
  }

  const stored = await hashPin(input.newPin);
  const { error } = await db
    .from('guest_accounts')
    .update({ pin_hash: stored.hash, pin_salt: stored.salt, failed_attempts: 0, locked_until: null })
    .eq('id', account.id);
  if (error) throw error;

  const { error: endErr } = await db.from('guest_auth_sessions').delete().eq('account_id', account.id);
  if (endErr) throw endErr;
  const sessionToken = await createSessionRow(db, account.id, account.business_id);
  return { ok: true, sessionToken };
}

export interface PinRecoveryInput {
  businessId: string;
  rawHandle: unknown;
  rawPhone: unknown;
  newPin: unknown;
  walletSecret: string | null;
}

const RECOVERY_REFUSED = 'We could not verify these details on this phone. Use the handle and mobile number you signed up with, on the phone you signed up on.';

/**
 * Forgot PIN, without a host or an SMS code. The person must prove two things: the mobile number on
 * the account, and that this device holds the account's wallet claim (the device they signed up on).
 * Every refusal gives the same message, so the form can't be used to check whether a handle exists.
 * A wrong number counts toward the same lockout as a wrong PIN.
 */
export async function recoverGuestPin(db: any, input: PinRecoveryInput, now: Date = new Date()): Promise<PinChangeResult> {
  const handle = normalizeHandle(input.rawHandle);
  const account = handle ? await findAccount(db, input.businessId, handle) : null;
  // Linked accounts have no PIN to recover; their password is reset through the account instead.
  if (!account || !account.pin_hash) return { ok: false, status: 401, error: RECOVERY_REFUSED };

  const lock = pinLockState(account.locked_until, now);
  if (lock.locked) {
    return {
      ok: false,
      status: 423,
      error: `Too many wrong attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} min.`,
      retryAfterSeconds: lock.retryAfterSeconds,
    };
  }

  if (!isValidPin(input.newPin)) return { ok: false, status: 400, error: 'Your new PIN must be exactly 6 digits.' };

  const device = input.walletSecret
    ? await authorizeGuestIdentifiers(db, [handle], input.walletSecret)
    : { owned: [], taken: [] };
  const onThisDevice = device.owned.some((id) => normalizeHandle(id) === handle);
  const phoneMatches = normalizePhone(input.rawPhone) !== null && normalizePhone(input.rawPhone) === account.phone;

  if (!onThisDevice || !phoneMatches) {
    await db.from('guest_accounts').update(nextFailureState(account.failed_attempts, now)).eq('id', account.id);
    return { ok: false, status: 401, error: RECOVERY_REFUSED };
  }

  const stored = await hashPin(input.newPin as string);
  const { error } = await db
    .from('guest_accounts')
    .update({ pin_hash: stored.hash, pin_salt: stored.salt, failed_attempts: 0, locked_until: null })
    .eq('id', account.id);
  if (error) throw error;

  const { error: endErr } = await db.from('guest_auth_sessions').delete().eq('account_id', account.id);
  if (endErr) throw endErr;
  const sessionToken = await createSessionRow(db, account.id, account.business_id);
  return { ok: true, sessionToken };
}

export async function endSessionForRequest(db: any, request: Request): Promise<void> {
  const token = readSessionCookie(request.headers.get('cookie'));
  if (!token) return;
  const { error } = await db.from('guest_auth_sessions').delete().eq('token_hash', hashSessionToken(token));
  if (error) throw error;
}
