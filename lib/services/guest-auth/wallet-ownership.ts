// Who this request may act for. A guest's wallet is proven in two ways, and either is enough:
//   1. the device's wallet secret matches the wallet's claim (wallet-claim.service), or
//   2. the request carries a valid sign-in session for that handle (PIN-verified, httpOnly cookie).
//
// (2) matters because a device can lose its wallet secret (browser storage cleared, or a failed
// account check in older builds). A signed-in guest is still the same person, so their session
// proves the wallet. When the session proves a handle this device does not own, the wallet is
// re-attached to this device, exactly as sign-in does.
import { readSessionCookie, hashSessionToken } from '@/lib/auth/guest-auth';
import {
  authorizeGuestIdentifiers,
  canonicalGuestId,
  readWalletSecret,
  type ClaimResult,
} from '@/lib/services/wallet/wallet-claim.service';
import { rebindWalletToDevice } from '@/lib/services/guest-auth/guest-account.service';

/** The handle of the request's live sign-in session, at any venue, or null. */
export async function sessionHandle(db: any, request: Request): Promise<string | null> {
  const token = readSessionCookie(request.headers.get('cookie'));
  if (!token) return null;

  const { data: session, error } = await db
    .from('guest_auth_sessions')
    .select('account_id, expires_at')
    .eq('token_hash', hashSessionToken(token))
    .maybeSingle();
  if (error) throw error;
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) return null;

  const { data: account, error: accountErr } = await db
    .from('guest_accounts')
    .select('handle')
    .eq('id', session.account_id)
    .maybeSingle();
  if (accountErr) throw accountErr;
  return account?.handle ? canonicalGuestId(account.handle) : null;
}

/** The identifiers this request owns, out of the ones asked about. Throws WalletClaimUnavailableError. */
export async function walletOwnership(db: any, request: Request, identifiers: Array<string | null | undefined>): Promise<ClaimResult> {
  const secret = readWalletSecret(request);
  const claim = await authorizeGuestIdentifiers(db, identifiers, secret);

  const owned = new Set(claim.owned.map(canonicalGuestId));
  const handle = await sessionHandle(db, request);
  const asked = identifiers.filter((i): i is string => typeof i === 'string').map(canonicalGuestId);

  if (handle && asked.includes(handle)) {
    if (secret && !owned.has(handle)) await rebindWalletToDevice(db, handle, secret);
    owned.add(handle);
  }

  return {
    owned: Array.from(owned),
    taken: claim.taken.filter((id) => !owned.has(canonicalGuestId(id))),
  };
}
