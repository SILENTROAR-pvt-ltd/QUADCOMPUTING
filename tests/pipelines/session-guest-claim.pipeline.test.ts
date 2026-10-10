import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { claimSessionGuest } from '@/lib/services/guest-session/session-guest.util';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const TABLE = 'table_number.eq.T-01';

// The incident: Harshit's earlier sessions at T-01 were settled but left open/bill_requested,
// and a later guest's scan or order rewrote them to the later guest's handle.
const seed = () => createFakeSupabase({
  dine_in_sessions: [
    { id: 'harshit-old', business_id: BIZ, table_number: 'T-01', status: 'bill_requested', guest_handle: null },
    { id: 'harshit-named', business_id: BIZ, table_number: 'T-01', status: 'open', guest_handle: '@harshit' },
    { id: 'current', business_id: BIZ, table_number: 'T-01', status: 'open', guest_handle: null },
  ],
});
const handleOf = (db: any, id: string) => db.tables.dine_in_sessions.find((s: any) => s.id === id)?.guest_handle;

describe('A session’s guest is set once and never taken over', () => {
  it('claims only the order’s own session', async () => {
    const db = seed();
    await claimSessionGuest(db, { guestHandle: '@bawa007', businessId: BIZ, sessionId: 'current', tableFilter: TABLE });
    expect(handleOf(db, 'current')).toBe('@bawa007');
    expect(handleOf(db, 'harshit-old')).toBeNull();
    expect(handleOf(db, 'harshit-named')).toBe('@harshit');
  });

  it('never overwrites a session that already has a guest', async () => {
    const db = seed();
    await claimSessionGuest(db, { guestHandle: '@bawa007', businessId: BIZ, sessionId: 'harshit-named' });
    expect(handleOf(db, 'harshit-named')).toBe('@harshit');
  });

  it('without a session id, touches only open sessions with no guest, never a bill_requested one', async () => {
    const db = seed();
    await claimSessionGuest(db, { guestHandle: '@bawa007', businessId: BIZ, tableFilter: TABLE });
    expect(handleOf(db, 'current')).toBe('@bawa007');
    expect(handleOf(db, 'harshit-old')).toBeNull();
    expect(handleOf(db, 'harshit-named')).toBe('@harshit');
  });

  it('does nothing without a guest, or without a session or table to aim at', async () => {
    const db = seed();
    await claimSessionGuest(db, { guestHandle: '', businessId: BIZ, sessionId: 'current' });
    await claimSessionGuest(db, { guestHandle: '@bawa007', businessId: BIZ });
    expect(db.tables.dine_in_sessions.map((s: any) => s.guest_handle)).toEqual([null, '@harshit', null]);
  });
});
