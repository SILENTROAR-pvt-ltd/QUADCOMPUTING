// A dine-in session's guest is set once, by the guest who opened the table, and is never taken
// over by a later scan or order. It used to be overwritten by whoever scanned last, including on
// earlier parties' unclosed sessions, which moved their bills and cashback to the wrong guest.
// (The database enforces the same rule: migration 20261010000017.)

export interface ClaimSessionGuest {
  guestHandle: string | null | undefined;
  businessId?: string | null;
  /** The exact session to claim. Preferred. */
  sessionId?: string | null;
  /** Without a session id: the table's currently open session, matched by this PostgREST or-filter. */
  tableFilter?: string | null;
}

export async function claimSessionGuest(db: any, c: ClaimSessionGuest): Promise<void> {
  if (!c.guestHandle || (!c.sessionId && !c.tableFilter)) return;
  let q = db.from('dine_in_sessions').update({ guest_handle: c.guestHandle }).is('guest_handle', null);
  if (c.businessId) q = q.eq('business_id', c.businessId);
  q = c.sessionId ? q.eq('id', c.sessionId) : q.eq('status', 'open').or(c.tableFilter);
  const { error } = await q;
  if (error) throw error;
}
