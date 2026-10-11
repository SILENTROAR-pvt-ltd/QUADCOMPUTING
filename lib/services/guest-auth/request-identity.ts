// Who a guest request is for. Only a signed-in guest has an identity (handle, name, phone), and it
// comes from their sign-in session. A handle the browser sends is never trusted: a new tab, a shared
// phone, or anyone typing someone else's handle used to attach that person's wallet and ID to a live
// table, and their cashback to the wrong guest.
import { accountForRequest } from './guest-account.service';

type Keys = { name: string; phone: string };

/** Sets the body's identity fields from the sign-in session, or clears the handle when signed out. */
export async function applyRequestIdentity(db: any, request: Request, businessId: string, body: Record<string, any>, keys: Keys): Promise<boolean> {
  const signedIn = await accountForRequest(db, request, businessId);
  if (signedIn) {
    body.guest_handle = signedIn.handle;
    body[keys.name] = signedIn.display_name;
    body[keys.phone] = signedIn.phone || undefined;
    return true;
  }
  // Anonymous: the order still carries the name and phone the guest typed, but no account handle.
  body.guest_handle = null;
  return false;
}
