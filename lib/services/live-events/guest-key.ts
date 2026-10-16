// One stable key per person at a venue, so repeat visits and event interest land on the same ledger row.
// A Vibers handle is the strongest identity, then a phone number, then an email. A walk-in with only a name has none:
// matching people by first name would merge strangers, so they are not added to the ledger.
export interface GuestIdentity { handle?: string | null; phone?: string | null; email?: string | null }

export const digitsOnly = (v: unknown) => String(v ?? '').replace(/\D/g, '');

export function normalizePhone(v: unknown): string | null {
  const d = digitsOnly(v);
  if (d.length < 10) return null;
  return d.slice(-10); // the national number: +91 98765 43210 and 098765 43210 are the same person
}

export function cleanEmail(v: unknown): string | null {
  const s = String(v ?? '').trim().toLowerCase();
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(s) ? s : null;
}

export function guestKey(id: GuestIdentity): string | null {
  const handle = String(id.handle ?? '').trim().toLowerCase();
  if (handle) return `h:${handle.startsWith('@') ? handle : `@${handle}`}`;
  const phone = normalizePhone(id.phone);
  if (phone) return `p:${phone}`;
  const email = cleanEmail(id.email);
  return email ? `e:${email}` : null;
}
