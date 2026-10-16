import { describe, expect, it, vi } from 'vitest';
import { staffMayCall, asStaffRole, terminalPath, gatewayPath, roleForTerminal } from './staff-roles';
import { readStaffSession, signStaffSession, staffTokenFromCookieHeader, STAFF_COOKIE } from './staff-session';
import { checkStaffPin, hashStaffPin, isFourDigitPin, listLoginStaff, MAX_PIN_FAILURES } from './staff-login.service';

const SECRET = 'test-secret-value';
const session = { sid: 's1', bid: 'b1', role: 'WAITER' as const, name: 'Rahul', exp: Math.floor(Date.now() / 1000) + 600 };

describe('roles and routes', () => {
  it('sends each role to its own terminal', () => {
    expect(terminalPath('b-1', 'WAITER')).toBe('/pos/terminal?business_id=b-1&tab=waiter');
    expect(terminalPath('b-1', 'CHEF')).toBe('/pos/terminal?business_id=b-1&tab=kitchen');
    expect(terminalPath('b-1', 'CASHIER')).toBe('/pos/terminal?business_id=b-1&tab=cashier');
    expect(gatewayPath('b-1')).toBe('/pos/staff-login?business_id=b-1');
    expect(gatewayPath('b-1', 'kitchen')).toBe('/pos/staff-login?business_id=b-1&tab=kitchen');
    expect(roleForTerminal('pos')).toBe('CASHIER');
    expect(roleForTerminal('Kitchen')).toBe('CHEF');
    expect(roleForTerminal('owner')).toBeNull();
    expect(asStaffRole('waiter')).toBe('WAITER');
    expect(asStaffRole('owner')).toBeNull();
  });

  it('lets a waiter run the floor and nothing financial', () => {
    expect(staffMayCall('WAITER', 'POST', '/api/host/tables/items')).toBe(true);
    expect(staffMayCall('WAITER', 'PATCH', '/api/host/sessions')).toBe(true);
    expect(staffMayCall('WAITER', 'GET', '/api/host/tables')).toBe(true);
    expect(staffMayCall('WAITER', 'POST', '/api/host/tables')).toBe(false);
    expect(staffMayCall('WAITER', 'POST', '/api/host/orders/create')).toBe(false);
    expect(staffMayCall('WAITER', 'GET', '/api/host/orders/history')).toBe(false);
    expect(staffMayCall('WAITER', 'GET', '/api/host/profile')).toBe(false);
    expect(staffMayCall('WAITER', 'GET', '/api/host/expenses/staff')).toBe(false);
  });

  it('keeps a chef to the kitchen', () => {
    expect(staffMayCall('CHEF', 'PATCH', '/api/host/kitchen/tickets')).toBe(true);
    expect(staffMayCall('CHEF', 'GET', '/api/host/sessions')).toBe(false);
    expect(staffMayCall('CHEF', 'GET', '/api/host/tables')).toBe(false);
  });

  it('gives a cashier billing, but not the owner\'s settings or table setup', () => {
    expect(staffMayCall('CASHIER', 'POST', '/api/host/orders/create')).toBe(true);
    expect(staffMayCall('CASHIER', 'GET', '/api/host/orders/history')).toBe(true);
    expect(staffMayCall('CASHIER', 'DELETE', '/api/host/tables')).toBe(false);
    expect(staffMayCall('CASHIER', 'GET', '/api/host/security/status')).toBe(false);
    expect(staffMayCall('CASHIER', 'PUT', '/api/host/settings/waiter-settle')).toBe(false);
    expect(staffMayCall('CASHIER', 'GET', '/api/host/tablesX')).toBe(false);
  });
});

describe('the staff session token', () => {
  it('round-trips', async () => {
    const token = await signStaffSession(session, SECRET);
    expect(await readStaffSession(token, SECRET)).toEqual(session);
  });

  it('is refused when changed, signed with another secret, expired or missing', async () => {
    const token = await signStaffSession(session, SECRET);
    const [body, sig] = token.split('.');
    const forged = `${btoa(JSON.stringify({ ...session, role: 'CASHIER' })).replace(/=+$/, '')}.${sig}`;
    expect(await readStaffSession(forged, SECRET)).toBeNull();
    expect(await readStaffSession(`${body}.AAAA`, SECRET)).toBeNull();
    expect(await readStaffSession(token, 'another-secret')).toBeNull();
    expect(await readStaffSession(token, SECRET, session.exp + 1)).toBeNull();
    expect(await readStaffSession(null, SECRET)).toBeNull();
    expect(await readStaffSession(token, null)).toBeNull();
  });

  it('finds its cookie in a header', () => {
    expect(staffTokenFromCookieHeader(`a=1; ${STAFF_COOKIE}=abc.def; b=2`)).toBe('abc.def');
    expect(staffTokenFromCookieHeader('a=1')).toBeNull();
  });
});

/** A fake client over a single staff row that records updates. */
function staffDb(row: any) {
  const updates: any[] = [];
  const chain: any = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.not = () => chain;
  chain.order = () => Promise.resolve({ data: Array.isArray(row) ? row : [row], error: null });
  chain.maybeSingle = async () => ({ data: row, error: null });
  chain.update = (patch: any) => { updates.push(patch); return chain; };
  return { from: () => chain, updates };
}

describe('the PIN check', () => {
  it('accepts only four digits', () => {
    expect(isFourDigitPin('1234')).toBe(true);
    for (const bad of ['123', '12345', 'abcd', '12 4', 1234, null]) expect(isFourDigitPin(bad)).toBe(false);
  });

  it('lets the right PIN in and clears the failure count', async () => {
    const row = { id: 's1', name: 'Rahul', role: 'WAITER', status: 'ACTIVE', is_pos_active: true, pin_hash: await hashStaffPin('1234'), pin_failures: 3, pin_locked_until: null };
    const db = staffDb(row);
    const out = await checkStaffPin(db, 'b1', 's1', '1234');
    expect(out).toMatchObject({ ok: true, staff: { id: 's1', role: 'WAITER' } });
    expect(db.updates[0]).toMatchObject({ pin_failures: 0, pin_locked_until: null });
  });

  it('counts a wrong PIN and locks after five in a row', async () => {
    const hash = await hashStaffPin('1234');
    const base = { id: 's1', name: 'Rahul', role: 'WAITER', status: 'ACTIVE', is_pos_active: true, pin_hash: hash, pin_locked_until: null };
    const wrong = await checkStaffPin(staffDb({ ...base, pin_failures: 1 }), 'b1', 's1', '0000');
    expect(wrong).toMatchObject({ ok: false, code: 'WRONG', triesLeft: MAX_PIN_FAILURES - 2 });
    const db = staffDb({ ...base, pin_failures: MAX_PIN_FAILURES - 1 });
    const locked = await checkStaffPin(db, 'b1', 's1', '0000');
    expect(locked).toMatchObject({ ok: false, code: 'LOCKED' });
    expect(db.updates[0].pin_locked_until).toBeTruthy();
  });

  it('refuses while locked, even for the right PIN', async () => {
    const now = Date.now();
    const row = { id: 's1', name: 'R', role: 'WAITER', status: 'ACTIVE', is_pos_active: true, pin_hash: await hashStaffPin('1234'), pin_failures: 0, pin_locked_until: new Date(now + 60_000).toISOString() };
    expect(await checkStaffPin(staffDb(row), 'b1', 's1', '1234', now)).toMatchObject({ ok: false, code: 'LOCKED' });
  });

  it('does not recognise someone who is inactive or has no PIN', async () => {
    const hash = await hashStaffPin('1234');
    const off = { id: 's1', name: 'R', role: 'WAITER', status: 'INACTIVE', is_pos_active: false, pin_hash: hash };
    expect(await checkStaffPin(staffDb(off), 'b1', 's1', '1234')).toMatchObject({ ok: false, code: 'UNKNOWN' });
    const noPin = { id: 's1', name: 'R', role: 'WAITER', status: 'ACTIVE', is_pos_active: true, pin_hash: null };
    expect(await checkStaffPin(staffDb(noPin), 'b1', 's1', '1234')).toMatchObject({ ok: false, code: 'UNKNOWN' });
  });

  it('lists only staff with a known role', async () => {
    const rows = [
      { id: 'a', name: 'Rahul', role: 'waiter', status: 'ACTIVE' },
      { id: 'b', name: 'Owner', role: 'MANAGER', status: 'ACTIVE' },
      { id: 'c', name: 'Gone', role: 'CHEF', status: 'INACTIVE' },
    ];
    const list = await listLoginStaff(staffDb(rows), 'b1');
    expect(list).toEqual([{ id: 'a', name: 'Rahul', role: 'WAITER' }]);
  });
});

vi.setConfig({ testTimeout: 15_000 });
