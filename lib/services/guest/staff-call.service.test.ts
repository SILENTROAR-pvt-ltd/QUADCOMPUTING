import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { cleanCallMessage, parseCallType, recordStaffCall, DUPLICATE_WINDOW_MS } from './staff-call.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const call = (over: Record<string, unknown> = {}) => ({ businessId: BIZ, tableNumber: 'T-01', type: 'WAITER' as const, message: null as string | null, ...over });

describe('a guest calling staff', () => {
  it('keeps a short plain message, and drops markup and control characters', () => {
    expect(cleanCallMessage('  A glass of   water, please  ')).toBe('A glass of water, please');
    expect(cleanCallMessage('<b>water</b>\u0007')).toBe('bwater/b');
    expect(cleanCallMessage('x'.repeat(300))).toHaveLength(140);
    expect(cleanCallMessage('   ')).toBeNull();
    expect(cleanCallMessage(42)).toBeNull();
  });

  it('knows the request types', () => {
    expect(parseCallType('waiter')).toBe('WAITER');
    expect(parseCallType('chef')).toBe('CHEF');
    expect(parseCallType('pizza')).toBeNull();
  });

  it('stores the call with the guest\'s message for the host to read', async () => {
    const db = createFakeSupabase({ staff_notifications: [] });
    const r = await recordStaffCall(db, call({ message: 'Water for four, please' }));
    expect(r.ok && r.duplicate).toBe(false);
    expect(db.tables.staff_notifications[0]).toMatchObject({ business_id: BIZ, table_number: 'T-01', notification_type: 'WAITER', message: 'Water for four, please', status: 'PENDING' });
  });

  it('a double tap is one call, so the bell rings once', async () => {
    const db = createFakeSupabase({ staff_notifications: [] });
    const t0 = Date.now();
    await recordStaffCall(db, call(), t0);
    const again = await recordStaffCall(db, call(), t0 + 2000);
    expect(again.ok && again.duplicate).toBe(true);
    expect(db.tables.staff_notifications).toHaveLength(1);
  });

  it('a different message, type or table is a new call, and so is the same call after the window', async () => {
    const db = createFakeSupabase({ staff_notifications: [] });
    const t0 = Date.now();
    await recordStaffCall(db, call({ message: 'Water' }), t0);
    await recordStaffCall(db, call({ message: 'Cutlery' }), t0 + 1000);
    await recordStaffCall(db, call({ message: 'Water', type: 'CHEF' }), t0 + 1000);
    await recordStaffCall(db, call({ message: 'Water', tableNumber: 'T-02' }), t0 + 1000);
    await recordStaffCall(db, call({ message: 'Water' }), t0 + DUPLICATE_WINDOW_MS + 5000);
    expect(db.tables.staff_notifications).toHaveLength(5);
  });
});
