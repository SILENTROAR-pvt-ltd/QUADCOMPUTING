import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const ctx = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db }));
vi.mock('@/lib/auth/guards', () => ({
  requireHost: async () => ({ error: null, businessId: BIZ, business: ctx.db.tables.businesses[0], supabase: ctx.db, user: { id: 'host-1' } }),
}));
vi.mock('@/lib/middleware/rate-limiter', async () => {
  const actual: any = await vi.importActual('@/lib/middleware/rate-limiter');
  return { ...actual, getClientIp: () => '10.0.0.1' };
});
import { POST as setPin } from '@/app/api/host/security/pin/route';
import { GET as status } from '@/app/api/host/security/status/route';
import { verifyPinCode } from '@/app/api/host/staff/verify-pin/verify-pin.service';

const post = (body: any) => setPin(new Request('http://x/api/host/security/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
const readStatus = async () => (await (await status(new Request('http://x/api/host/security/status'))).json());

beforeEach(() => {
  ctx.db = createFakeSupabase({ businesses: [{ id: BIZ, admin_pin: null, staff_pin: null, admin_pin_hash: null, staff_pin_hash: null, protected_modules: null }], staff_profiles: [] });
});

describe('Master PIN, end to end', () => {
  it('a set PIN is stored hashed, reported as on, and unlocks the lock screen', async () => {
    const res = await post({ kind: 'admin', pin: '4821', currentPin: '' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ isAdminPinSet: true });

    const row = ctx.db.tables.businesses[0];
    expect(row.admin_pin_hash).toMatch(/^scrypt:/);
    expect(row.admin_pin).toBeNull();
    expect((await readStatus()).isAdminPinActive).toBe(true);

    expect(await verifyPinCode('4821', BIZ, ctx.db)).toMatchObject({ status: 200, data: { success: true, staff: { isAdmin: true } } });
    expect((await verifyPinCode('4822', BIZ, ctx.db)).status).toBe(401);
  });

  it('refuses a guessable PIN such as 1111 and stores nothing', async () => {
    const res = await post({ kind: 'admin', pin: '1111', currentPin: '' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/repeated/);
    expect(ctx.db.tables.businesses[0].admin_pin_hash).toBeNull();
    expect((await readStatus()).isAdminPinActive).toBe(false);
  });

  it('needs the current master PIN to change it', async () => {
    await post({ kind: 'admin', pin: '4821', currentPin: '' });
    expect((await post({ kind: 'admin', pin: '5930', currentPin: '1111' })).status).toBe(401);
    expect((await post({ kind: 'admin', pin: '5930', currentPin: '4821' })).status).toBe(200);
    expect((await verifyPinCode('5930', BIZ, ctx.db)).status).toBe(200);
    expect((await verifyPinCode('4821', BIZ, ctx.db)).status).toBe(401);
  });

  it('removing it turns the lock off', async () => {
    await post({ kind: 'admin', pin: '4821', currentPin: '' });
    expect(await (await post({ kind: 'admin', pin: null, currentPin: '4821' })).json()).toMatchObject({ isAdminPinSet: false });
    expect((await readStatus()).isAdminPinActive).toBe(false);
  });

  it('keeps master and staff PINs different', async () => {
    await post({ kind: 'admin', pin: '4821', currentPin: '' });
    expect((await post({ kind: 'staff', pin: '4821', currentPin: '4821' })).status).toBe(400);
    expect((await post({ kind: 'staff', pin: '5930', currentPin: '4821' })).status).toBe(200);
    expect((await readStatus()).isStaffPinActive).toBe(true);
  });
});
