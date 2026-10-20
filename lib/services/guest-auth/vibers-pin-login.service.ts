// Sign in with @handle + 6-digit PIN, for people who set a PIN when they made their Vibers profile. One handle and one
// PIN work at every property: at a venue the person has not visited yet, the PIN is checked against the one they set
// elsewhere and this venue's guest record is created on the spot.
import { isValidPin, normalizeHandle, pinLockState, verifyPin } from '@/lib/auth/guest-auth';
import { recordPinFailure } from './guest-account.service';
import { findAccount, signIn, type GuestAuthResult } from './guest-account.service';
import { connectVenue, pinFromOtherVenue } from './vibers-connect.service';

const REFUSED = 'Handle or PIN is incorrect.';

export async function pinSignIn(args: { db: any; businessId: string; rawHandle: unknown; pin: unknown; walletSecret: string | null; now?: Date }): Promise<GuestAuthResult> {
  const { db, businessId, walletSecret } = args;
  const now = args.now ?? new Date();
  const handle = normalizeHandle(args.rawHandle);
  if (!handle || !isValidPin(args.pin)) return { ok: false, status: 401, error: REFUSED };

  // Already a guest here with a PIN: the ordinary path, with its own lockout.
  const here = await findAccount(db, businessId, handle);
  if (here?.pin_hash && here.pin_salt) return signIn({ db, businessId, rawHandle: handle, pin: args.pin, walletSecret, now });

  // Otherwise: whose handle is it, and what PIN did they set (at any venue)?
  const { data: owner, error: ownerErr } = await db.from('vibers_accounts').select('user_id').eq('handle', handle).maybeSingle();
  if (ownerErr) throw ownerErr;
  if (!owner) return { ok: false, status: 401, error: REFUSED };
  const reference = await pinFromOtherVenue(db, owner.user_id);
  if (!reference) return { ok: false, status: 401, error: REFUSED };

  const lock = pinLockState(reference.locked_until, now);
  if (lock.locked) {
    return { ok: false, status: 423, error: `Too many wrong PINs. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} min.`, retryAfterSeconds: lock.retryAfterSeconds };
  }
  if (!(await verifyPin(args.pin as string, { hash: reference.hash, salt: reference.salt }))) {
    await recordPinFailure(db, reference.id, now);
    return { ok: false, status: 401, error: REFUSED };
  }
  await db.from('guest_accounts').update({ failed_attempts: 0, locked_until: null }).eq('id', reference.id);

  const connected = await connectVenue(db, owner.user_id, businessId, walletSecret);
  if (!connected.ok) return { ok: false, status: connected.status, error: connected.error };
  return { ok: true, account: connected.account, sessionToken: connected.sessionToken, walletRebound: Boolean(walletSecret) };
}

