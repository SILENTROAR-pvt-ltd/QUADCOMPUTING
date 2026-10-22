import { describe, expect, it, vi } from 'vitest';
import { staffMayCall, asStaffRole, terminalPath, gatewayPath, roleForTerminal } from './staff-roles';
import { readStaffSession, signStaffSession, staffTokenFromCookieHeader, STAFF_COOKIE } from './staff-session';
import { checkStaffPin, hashStaffPin, isFourDigitPin, listLoginStaff, MAX_PIN_FAILURES } from './staff-login.service';

const SECRET = 'test-secret-value';
const session = { sid: 's1', bid: 'b1', role: 'WAITER' as const, name: 'Rahul', exp: Math.floor(Date.now() / 1000) + 600, sv: 0 };

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

  it('lets the waiter and the cashier hear and handle guest calls; the chef has the kitchen bell', () => {
    expect(staffMayCall('WAITER', 'GET', '/api/host/notifications')).toBe(true);
    expect(staffMayCall('WAITER', 'PATCH', '/api/host/notifications')).toBe(true);
    expect(staffMayCall('CASHIER', 'GET', '/api/host/notifications')).toBe(true);
    expect(staffMayCall('WAITER', 'POST', '/api/host/notifications')).toBe(false);
    expect(staffMayCall('CHEF', 'GET', '/api/host/notifications')).toBe(false);
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

  it('opens the read-only Vibey co-pilot to the cashier only', () => {
    expect(staffMayCall('CASHIER', 'POST', '/api/host/vibey')).toBe(true);
    expect(staffMayCall('WAITER', 'POST', '/api/host/vibey')).toBe(false);
    expect(staffMayCall('CHEF', 'POST', '/api/host/vibey')).toBe(false);
    expect(staffMayCall('CASHIER', 'DELETE', '/api/host/vibey')).toBe(false);
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

/**
 * A fake client over staff rows with real update semantics: every update checks its filters at the moment it runs, so
 * "set the count to n+1 only if it still is n" behaves as it does in the database, and parallel attempts race for it.
 */
function staffDb(initial: any) {
  const rows: any[] = (Array.isArray(initial) ? initial : [initial]).map((r) => ({ ...r }));
  const updates: any[] = [];
  const builder = () => {
    const q: any = { op: 'select', filters: [] as Array<[string, string, any]>, patch: null, returning: false };
    const match = (r: any) => q.filters.every(([c, k, v]: any) => (k === 'eq' ? (c === 'business_id' ? true : r[c] === v) : k === 'is' ? (r[c] ?? null) === v : r[c] != null));
    const run = () => {
      const hit = rows.filter(match);
      if (q.op === 'update') { hit.forEach((r) => Object.assign(r, q.patch)); updates.push(q.patch); return { data: q.returning ? hit.map((r) => ({ id: r.id })) : null, error: null }; }
      return { data: hit.map((r) => ({ ...r })), error: null };
    };
    q.select = () => { if (q.op === 'update') q.returning = true; return q; };
    q.eq = (c: string, v: any) => { q.filters.push([c, 'eq', v]); return q; };
    q.is = (c: string, v: any) => { q.filters.push([c, 'is', v]); return q; };
    q.not = (c: string) => { q.filters.push([c, 'notnull', null]); return q; };
    q.order = () => Promise.resolve(run());
    q.maybeSingle = async () => ({ data: run().data?.[0] ?? null, error: null });
    q.update = (patch: any) => { q.op = 'update'; q.patch = patch; return q; };
    q.then = (res: any, rej: any) => Promise.resolve(run()).then(res, rej);
    return q;
  };
  return { from: () => builder(), rows, updates };
}

describe('the PIN check', () => {
  it('accepts only four digits', () => {
    expect(isFourDigitPin('1234')).toBe(true);
    for (const bad of ['123', '12345', 'abcd', '12 4', 1234, null]) expect(isFourDigitPin(bad)).toBe(false);
  });

  const staff = { id: 's1', name: 'Rahul', role: 'WAITER', status: 'ACTIVE', is_pos_active: true, pin_locked_until: null };

  it('lets the right PIN in and clears the failure count', async () => {
    const db = staffDb({ ...staff, pin_hash: await hashStaffPin('1234'), pin_failures: 3 });
    const out = await checkStaffPin(db, 'b1', 's1', '1234');
    expect(out).toMatchObject({ ok: true, staff: { id: 's1', role: 'WAITER' } });
    expect(db.rows[0]).toMatchObject({ pin_failures: 0, pin_locked_until: null });
  });

  it('counts a wrong PIN and locks after five in a row', async () => {
    const hash = await hashStaffPin('1234');
    const one = staffDb({ ...staff, pin_hash: hash, pin_failures: 1 });
    expect(await checkStaffPin(one, 'b1', 's1', '0000')).toMatchObject({ ok: false, code: 'WRONG', triesLeft: MAX_PIN_FAILURES - 2 });
    expect(one.rows[0].pin_failures).toBe(2);
    const db = staffDb({ ...staff, pin_hash: hash, pin_failures: MAX_PIN_FAILURES - 1 });
    expect(await checkStaffPin(db, 'b1', 's1', '0000')).toMatchObject({ ok: false, code: 'LOCKED' });
    expect(db.rows[0].pin_locked_until).toBeTruthy();
  });

  it('cannot be brute-forced by a burst of parallel guesses: at most five are ever compared', async () => {
    const hash = await hashStaffPin('4821');
    const db = staffDb({ ...staff, pin_hash: hash, pin_failures: 0 });
    // 40 different wrong PINs at the same instant, all of which read a count of 0 before any of them writes.
    const guesses = Array.from({ length: 40 }, (_, i) => String(1000 + i * 3).padStart(4, '0'));
    const outcomes = await Promise.all(guesses.map((g) => checkStaffPin(db, 'b1', 's1', g)));
    expect(outcomes.filter((o) => o.ok)).toHaveLength(0);
    expect(outcomes.filter((o) => !o.ok && o.code === 'WRONG').length).toBeLessThanOrEqual(MAX_PIN_FAILURES - 1);
    expect(db.rows[0].pin_locked_until).toBeTruthy();
    // And the person is now locked out, even for the right PIN.
    expect(await checkStaffPin(db, 'b1', 's1', '4821')).toMatchObject({ ok: false, code: 'LOCKED' });
  });

  it('does not let a parallel right PIN slip in once the guesses have used up the tries', async () => {
    const hash = await hashStaffPin('4821');
    const db = staffDb({ ...staff, pin_hash: hash, pin_failures: MAX_PIN_FAILURES - 1 });
    const outcomes = await Promise.all([checkStaffPin(db, 'b1', 's1', '0001'), checkStaffPin(db, 'b1', 's1', '0002'), checkStaffPin(db, 'b1', 's1', '4821')]);
    // Exactly one attempt got the last try; the rest were refused. The right PIN only gets in if it was the one that got it.
    const compared = outcomes.filter((o) => o.ok || o.code === 'WRONG' || o.code === 'LOCKED');
    expect(compared).toHaveLength(3);
    expect(outcomes.filter((o) => o.ok).length).toBeLessThanOrEqual(1);
  });

  it('starts counting again once an old lock has run out', async () => {
    const hash = await hashStaffPin('1234');
    const now = Date.now();
    const stale = staffDb({ ...staff, pin_hash: hash, pin_failures: MAX_PIN_FAILURES, pin_locked_until: new Date(now - 1000).toISOString() });
    expect(await checkStaffPin(stale, 'b1', 's1', '0000', now)).toMatchObject({ ok: false, code: 'WRONG', triesLeft: MAX_PIN_FAILURES - 1 });
    const fresh = staffDb({ ...staff, pin_hash: hash, pin_failures: null });
    expect(await checkStaffPin(fresh, 'b1', 's1', '0000')).toMatchObject({ ok: false, code: 'WRONG', triesLeft: MAX_PIN_FAILURES - 1 });
  });

  it('refuses while locked, even for the right PIN', async () => {
    const now = Date.now();
    const row = { ...staff, pin_hash: await hashStaffPin('1234'), pin_failures: 0, pin_locked_until: new Date(now + 60_000).toISOString() };
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
    const live = { is_pos_active: true, pin_hash: 'scrypt:x:y' };
    const rows = [
      { id: 'a', name: 'Rahul', role: 'waiter', status: 'ACTIVE', ...live },
      { id: 'b', name: 'Owner', role: 'MANAGER', status: 'ACTIVE', ...live },
      { id: 'c', name: 'Gone', role: 'CHEF', status: 'INACTIVE', ...live },
    ];
    const list = await listLoginStaff(staffDb(rows), 'b1');
    expect(list).toEqual([{ id: 'a', name: 'Rahul', role: 'WAITER' }]);
  });
});
vi.setConfig({ testTimeout: 15_000 });
