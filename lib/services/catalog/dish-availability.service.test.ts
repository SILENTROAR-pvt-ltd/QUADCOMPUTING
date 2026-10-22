import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { DishAvailabilityError, setDishAvailability } from './dish-availability.service';
import { STAFF_ROLES, staffMayCall } from '@/lib/services/staff-auth/staff-roles';
import { catalogStatus } from '@/components/host/workspaces/catalog/hooks/catalog-status';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'cccccccc-1111-4222-8333-444444444444';
const DISH = '11111111-aaaa-4bbb-8ccc-000000000001';
const THEIRS = '11111111-aaaa-4bbb-8ccc-000000000002';
const ROOM = '11111111-aaaa-4bbb-8ccc-000000000003';
const GONE = '11111111-aaaa-4bbb-8ccc-000000000004';

const seed = () => createFakeSupabase({
  catalog_items: [
    { id: DISH, business_id: BIZ, name: 'Paneer Tikka', item_type: 'food', category: 'Starters', is_available: true, metadata: {} },
    { id: THEIRS, business_id: OTHER, name: 'Dal', item_type: 'food', category: 'Mains', is_available: true, metadata: {} },
    { id: ROOM, business_id: BIZ, name: 'Deluxe', item_type: 'room', category: 'Accommodations', is_available: true, metadata: {} },
    { id: GONE, business_id: BIZ, name: 'Old dish', item_type: 'food', category: 'Mains', is_available: false, metadata: { deleted: true } },
  ],
});

const refusal = async (p: Promise<unknown>) => {
  try { await p; } catch (err) { return err instanceof DishAvailabilityError ? err.status : 'other'; }
  return 'none';
};

describe('switching a dish on and off the guest menu', () => {
  it('turns a dish off and back on, at this venue only', async () => {
    const db = seed();
    expect(await setDishAvailability(db, BIZ, DISH, false)).toEqual({ id: DISH, is_available: false });
    expect(db.tables.catalog_items.find((r) => r.id === DISH)?.is_available).toBe(false);
    expect(await setDishAvailability(db, BIZ, DISH, true)).toEqual({ id: DISH, is_available: true });
    expect(db.tables.catalog_items.find((r) => r.id === DISH)?.is_available).toBe(true);
  });

  it("never touches another venue's dish", async () => {
    const db = seed();
    expect(await refusal(setDishAvailability(db, BIZ, THEIRS, false))).toBe(404);
    expect(db.tables.catalog_items.find((r) => r.id === THEIRS)?.is_available).toBe(true);
  });

  it('refuses rooms, deleted dishes, bad ids and a missing on/off', async () => {
    const db = seed();
    expect(await refusal(setDishAvailability(db, BIZ, ROOM, false))).toBe(400);
    expect(await refusal(setDishAvailability(db, BIZ, GONE, true))).toBe(404);
    expect(await refusal(setDishAvailability(db, BIZ, 'addon_x', false))).toBe(400);
    expect(await refusal(setDishAvailability(db, BIZ, DISH, 'off'))).toBe(400);
    expect(db.tables.catalog_items.find((r) => r.id === GONE)?.is_available).toBe(false);
    expect(db.tables.catalog_items.find((r) => r.id === ROOM)?.is_available).toBe(true);
  });

  it('is the owner\'s switch: no staff sign-in may call it, though they still read the catalogue', () => {
    for (const role of STAFF_ROLES) expect(staffMayCall(role, 'POST', '/api/host/catalog/availability')).toBe(false);
    expect(staffMayCall('WAITER', 'GET', '/api/host/catalog')).toBe(true);
  });

  it('shows a switched-off dish as off and hides a deleted one from the catalogue', () => {
    expect(catalogStatus({ is_available: true, metadata: {} })).toBe('active');
    expect(catalogStatus({ is_available: null })).toBe('active');
    expect(catalogStatus({ is_available: false, metadata: {} })).toBe('sold_out');
    expect(catalogStatus({ is_available: false, metadata: { deleted: true } })).toBe('archived');
  });
});
