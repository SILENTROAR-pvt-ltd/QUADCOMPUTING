import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { deleteHostTable } from '@/lib/services/table/table-crud.service';
import { updateHostTable } from '@/lib/services/table/update-table.service';
import { deleteCatalogItem } from '@/lib/services/catalog/delete-item.service';
import { executeCatalogDelete } from '@/lib/services/catalog-delete.service';
import { deleteRoomCategoryAddon } from '@/lib/services/catalog-delete-addon.service';
import { deleteAccommodationCategory } from '@/lib/services/accommodation/category-crud.service';
import { verifyRedemptionCode } from '@/lib/services/wallet/redemption.service';

// Two venues on one database, as on launch day: every write venue A's host makes with an id that belongs to venue B
// must leave venue B exactly as it was, whatever the id points at.
const A = 'aaaaaaaa-1111-4222-8333-444444444444';
const B = 'bbbbbbbb-1111-4222-8333-444444444444';
const TABLE_A = '0a000000-1111-4222-8333-444444444444';
const TABLE_B = '0b000000-1111-4222-8333-444444444444';
const DISH_A = '1a000000-1111-4222-8333-444444444444';
const DISH_B = '1b000000-1111-4222-8333-444444444444';
const ROOMS_B = '2b000000-1111-4222-8333-444444444444';

function twoVenues() {
  return createFakeSupabase({
    businesses: [{ id: A, host_id: 'host-a' }, { id: B, host_id: 'host-b' }],
    restaurant_tables: [
      { id: TABLE_A, business_id: A, table_number: 'T-01', status: 'VACANT', is_active: true },
      { id: TABLE_B, business_id: B, table_number: 'T-01', status: 'VACANT', is_active: true },
    ],
    catalog_items: [
      { id: DISH_A, business_id: A, name: 'Dal', is_available: true },
      { id: DISH_B, business_id: B, name: 'Paneer', is_available: true },
    ],
    recipe_ingredients: [{ id: 'r-b', business_id: B, catalog_item_id: DISH_B, raw_item_id: 'x' }],
    inventory_stock: [{ id: 's-b', catalog_item_id: DISH_B, stock_quantity: 9 }],
    room_categories: [{ id: ROOMS_B, business_id: B, name: 'Deluxe', addons: [{ id: 'cp', name: 'Breakfast (CP)' }] }],
    rooms: [],
    tables: [],
    wallet_redemptions: [
      { id: 'w-b', code: 'QC-RDM-222222', business_id: B, cafe_id: B, status: 'redeemed', amount: 50, expires_at: '2099-01-01T00:00:00Z' },
    ],
  });
}

const tableB = (db: any) => db.tables.restaurant_tables.find((t: any) => t.id === TABLE_B);
const post = (body: unknown) => new Request('http://localhost/api/host/catalog/delete', { method: 'POST', body: JSON.stringify(body) });

describe('one venue cannot touch another venue’s records', () => {
  it('tables: a removal or status change aimed at another venue’s table changes nothing there', async () => {
    const db = twoVenues();
    await deleteHostTable({ id: TABLE_B }, null, db, A);
    await expect(updateHostTable({ id: TABLE_B, status: 'CLEANING' }, null, db, A)).rejects.toThrow();
    expect(tableB(db)).toMatchObject({ is_active: true, status: 'VACANT' });

    await deleteHostTable({ id: TABLE_A }, null, db, A); // its own table still goes
    expect(db.tables.restaurant_tables.find((t: any) => t.id === TABLE_A)?.is_active).toBe(false);
    // A venue named in the request body is never taken as the venue.
    await expect(deleteHostTable({ id: TABLE_B, business_id: B }, null, db, undefined)).rejects.toThrow();
    await expect(updateHostTable({ id: TABLE_B, business_id: B, status: 'CLEANING' }, null, db, undefined)).rejects.toThrow();
    expect(tableB(db)).toMatchObject({ is_active: true, status: 'VACANT' });
  });

  it('menu: deleting another venue’s dish is refused and its recipe and stock stay', async () => {
    const db = twoVenues();
    await expect(deleteCatalogItem(DISH_B, db, A)).rejects.toMatchObject({ status: 404 });
    await expect(executeCatalogDelete(post({ id: DISH_B }), db, A)).rejects.toMatchObject({ status: 404 });
    await expect(deleteCatalogItem(DISH_B, db, '')).rejects.toMatchObject({ status: 400 });
    expect(db.tables.catalog_items.map((c: any) => c.id)).toContain(DISH_B);
    expect(db.tables.recipe_ingredients).toHaveLength(1);
    expect(db.tables.inventory_stock).toHaveLength(1);

    await deleteCatalogItem(DISH_A, db, A); // its own dish still goes
    expect(db.tables.catalog_items.map((c: any) => c.id)).toEqual([DISH_B]);
  });

  it('rooms: another venue’s room category and its add-ons cannot be deleted', async () => {
    const db = twoVenues();
    expect(await deleteRoomCategoryAddon(db, A, 'cp', 'Breakfast (CP)', ROOMS_B)).toBe(false);
    expect(await deleteAccommodationCategory(ROOMS_B, db, 'host-a', A)).toMatchObject({ success: false, status: 404 });
    expect(await deleteAccommodationCategory(ROOMS_B, db, 'host-a', '')).toMatchObject({ success: false, status: 400 });
    expect(db.tables.room_categories).toHaveLength(1);
    expect(db.tables.room_categories[0].addons).toHaveLength(1);
  });

  it('wallet: another venue’s code says nothing about itself, not even that it was used', async () => {
    const db = twoVenues();
    const res: any = await verifyRedemptionCode(db, { code: 'QC-RDM-222222', business_id: A });
    expect(res).toMatchObject({ success: false, error: 'This redemption code is not valid for this venue.' });
    expect(res.already_redeemed).toBeUndefined();
    expect(((await verifyRedemptionCode(db, { code: 'QC-RDM-222222' })) as any).success).toBe(false);
  });
});
