import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { cleanTableItems } from '@/lib/services/session/table-items-input';
import { ensureOpenSession } from '@/lib/services/session/table-items.service';
import { tableGuestInfo } from '@/lib/utils/table-guest';

const VENUE = 'aaaaaaaa-1111-4222-8333-444444444444';
const ITEM = 'bbbbbbbb-1111-4222-8333-444444444444';

describe('Adding items to a table: what a host may send', () => {
  it('accepts catalogue items with a sensible quantity and tidies the note', () => {
    const out = cleanTableItems({ table_number: 'T-01', items: [{ item_id: ITEM, quantity: 2, notes: ' <no onion> ' }] });
    expect(out).toEqual({ ok: true, value: { table_number: 'T-01', items: [{ item_id: ITEM, quantity: 2, notes: 'no onion' }] } });
  });

  it('refuses anything that is not a catalogue item, a sane quantity, or a real table', () => {
    expect(cleanTableItems({ table_number: 'T-01', items: [{ item_id: 'addon_room_1', quantity: 1 }] })).toMatchObject({ ok: false });
    expect(cleanTableItems({ table_number: 'T-01', items: [{ item_id: ITEM, quantity: 0 }] })).toMatchObject({ ok: false });
    expect(cleanTableItems({ table_number: 'T-01', items: [{ item_id: ITEM, quantity: 51 }] })).toMatchObject({ ok: false });
    expect(cleanTableItems({ table_number: '../x', items: [{ item_id: ITEM, quantity: 1 }] })).toMatchObject({ ok: false });
    expect(cleanTableItems({ table_number: 'T-01', items: [] })).toMatchObject({ ok: false });
  });
});

describe('Adding items to a table: the table session', () => {
  it('uses the table\'s open session when there is one', async () => {
    const db = createFakeSupabase({
      dine_in_sessions: [{ id: 'sess-1', business_id: VENUE, table_number: 'T-01', status: 'open' }],
      restaurant_tables: [],
    });
    expect(await ensureOpenSession(db, VENUE, 'T-01')).toEqual({ ok: true, id: 'sess-1' });
    expect(db.tables.dine_in_sessions).toHaveLength(1);
  });

  it('opens a walk-in session for a set-up table with none open', async () => {
    const db = createFakeSupabase({
      dine_in_sessions: [],
      restaurant_tables: [{ id: 'tbl-2', business_id: VENUE, table_number: 'T-02', is_active: true }],
    });
    const out = await ensureOpenSession(db, VENUE, 'T-02');
    expect(out.ok).toBe(true);
    expect(db.tables.dine_in_sessions[0]).toMatchObject({ table_number: 'T-02', status: 'open', table_id: 'tbl-2' });
    expect(db.tables.dine_in_sessions[0].guest_session_id).toMatch(/^host-/);
  });

  it('refuses a table that is not set up for the venue', async () => {
    const db = createFakeSupabase({ dine_in_sessions: [], restaurant_tables: [] });
    expect(await ensureOpenSession(db, VENUE, 'T-99')).toMatchObject({ ok: false });
    expect(db.tables.dine_in_sessions).toHaveLength(0);
  });
});

describe('Adding items to a table: who is at the table', () => {
  it('names a guest-app session by handle and a walk-in by the host', () => {
    const guest = tableGuestInfo({ guest_session_id: 'gst_123', guest_handle: '@asha', created_at: '2026-10-08T12:00:00Z' }, { customer_name: 'Asha', customer_phone: '9876543210' });
    expect(guest).toMatchObject({ name: 'Asha', handle: '@asha', phone: '9876543210', sessionUid: 'gst_123', walkIn: false });
    const walkIn = tableGuestInfo({ guest_session_id: 'host-abcdef12-3456', guest_handle: null }, null);
    expect(walkIn).toMatchObject({ name: 'Guest', walkIn: true });
  });
});
