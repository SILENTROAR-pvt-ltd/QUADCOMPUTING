import { accountForRequest } from '@/lib/services/guest-auth/guest-account.service';
import { signedInUser } from '@/lib/services/guest-auth/vibers-connect.service';
import { cleanEmail, normalizePhone } from './guest-key';

export interface GuestContact {
  signedIn: boolean;
  name: string;
  handle: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Who this request's guest is, from their own sign-in only: the guest session at this venue (name, @handle, phone) and
 * the Vibers account's email. Nothing the browser sends is trusted for a signed-in guest.
 */
export async function guestContact(db: any, request: Request, businessId: string): Promise<GuestContact> {
  const empty: GuestContact = { signedIn: false, name: '', handle: null, email: null, phone: null };
  let account: any = null;
  try { account = await accountForRequest(db, request, businessId); } catch { /* treated as not signed in */ }
  if (!account) return empty;
  const user = await signedInUser();
  return {
    signedIn: true,
    name: String(account.display_name || '').trim(),
    handle: account.handle || null,
    email: cleanEmail(user?.email),
    phone: normalizePhone(account.phone),
  };
}
