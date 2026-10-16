import { cleanEmail, guestKey, normalizePhone, type GuestIdentity } from './guest-key';

/** Names that say nothing about who the guest is: the defaults the till and the order use for an unnamed walk-in. */
const GENERIC_NAMES = new Set(['', 'guest', 'walk-in guest', 'walk in guest', 'customer']);

export const cleanName = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
const nameKey = (v: unknown) => {
  const n = cleanName(v).toLowerCase();
  return GENERIC_NAMES.has(n) ? '' : `n:${n}`;
};

/**
 * The key this person already has at this venue, if a ledger row holds their handle, phone or email; otherwise the key
 * their details give. A guest who gave a phone once and an email the next is the same person.
 */
export async function resolveGuestKey(db: any, businessId: string, who: GuestIdentity): Promise<string | null> {
  const key = guestKey(who);
  if (!key) return null;
  const phone = normalizePhone(who.phone), email = cleanEmail(who.email);
  const handle = String(who.handle ?? '').trim().toLowerCase();
  // Values go into a PostgREST filter string, so anything with a comma, bracket or space is left out rather than escaped.
  const safe = (v: string) => /^[\w@.+\-]+$/.test(v);
  const clauses = [`guest_key.eq.${key}`].filter(() => safe(key));
  if (phone && safe(phone)) clauses.push(`phone.eq.${phone}`);
  if (email && safe(email)) clauses.push(`email.eq.${email}`);
  const at = handle.startsWith('@') ? handle : `@${handle}`;
  if (handle && safe(at)) clauses.push(`vibers_handle.eq.${at}`);
  if (clauses.length === 0) return key;
  try {
    const { data } = await db.from('venue_guest_ledger').select('guest_key').eq('business_id', businessId).or(clauses.join(',')).order('first_seen_at', { ascending: true }).limit(1);
    return data?.[0]?.guest_key || key;
  } catch {
    return key;
  }
}

/**
 * Who a paying guest is in the ledger. Signed-in or with a phone or email: that identity. A walk-in with only a name: one
 * guest per name at the venue. A walk-in with no name at all: one guest per bill (there is nothing to tell them apart by).
 */
export async function ledgerKeyFor(db: any, businessId: string, who: GuestIdentity & { name?: string | null }, orderId: string): Promise<string> {
  const known = await resolveGuestKey(db, businessId, who);
  if (known) return known;
  return nameKey(who.name) || `o:${orderId}`;
}

/**
 * Records one settled bill for the guest who paid it: a visit, its spend, and when. A bill is counted once, however many
 * times it is settled. Best-effort: the bill is already settled, so a ledger failure must never reach the till, but it is
 * logged rather than swallowed, so a missing migration shows up.
 */
export async function recordLedgerVisit(
  db: any,
  businessId: string,
  orderId: string | null,
  who: { handle?: string | null; phone?: string | null; email?: string | null; name?: string | null },
  spend: number,
  at?: string | null,
): Promise<void> {
  if (!orderId) return;
  const key = await ledgerKeyFor(db, businessId, who, orderId);
  const name = nameKey(who.name) ? cleanName(who.name) : 'Walk-in guest';
  const { error } = await db.rpc('ledger_record_visit', {
    p_business_id: businessId, p_order_id: orderId, p_guest_key: key, p_guest_name: name,
    p_handle: who.handle ? String(who.handle).toLowerCase() : null,
    p_email: cleanEmail(who.email),
    p_phone: key.startsWith('p:') ? key.slice(2) : normalizePhone(who.phone),
    p_spend: Number.isFinite(spend) ? spend : 0,
    p_at: at ?? new Date().toISOString(),
  });
  if (error) console.error('[ledger] could not record a visit (migration 20261016000010 applied?):', error.message);
}
