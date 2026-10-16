import { describe, expect, it } from 'vitest';
import { parseNewStaff, parseStaffChange } from './staff-access-input';
import { staffMayCall } from './staff-roles';

const ID = '5f0c2f4e-2a56-4c61-9a3e-0e7d3b9c1a11';

describe('adding a staff member', () => {
  it('takes a name, a role and a 4-digit PIN', () => {
    expect(parseNewStaff({ name: '  Rahul  Kumar ', role: 'waiter', pin: '1234' })).toEqual({ ok: true, value: { name: 'Rahul Kumar', role: 'WAITER', pin: '1234' } });
  });

  it('refuses a missing name, an unknown role or a PIN that is not four digits', () => {
    expect(parseNewStaff({ name: 'R', role: 'WAITER', pin: '1234' }).ok).toBe(false);
    expect(parseNewStaff({ name: 'Rahul', role: 'MANAGER', pin: '1234' }).ok).toBe(false);
    for (const pin of ['123', '12345', 'abcd', '', undefined]) expect(parseNewStaff({ name: 'Rahul', role: 'CHEF', pin }).ok).toBe(false);
  });
});

describe('changing a staff member', () => {
  it('accepts a role, a new PIN or switching them off', () => {
    expect(parseStaffChange({ id: ID, role: 'cashier' })).toEqual({ ok: true, value: { id: ID, role: 'CASHIER' } });
    expect(parseStaffChange({ id: ID, pin: '9999' })).toEqual({ ok: true, value: { id: ID, pin: '9999' } });
    expect(parseStaffChange({ id: ID, active: false })).toEqual({ ok: true, value: { id: ID, active: false } });
  });

  it('renames, tidying spaces, and can rename and re-PIN in one change', () => {
    expect(parseStaffChange({ id: ID, name: '  Raj   Shamani ' })).toEqual({ ok: true, value: { id: ID, name: 'Raj Shamani' } });
    expect(parseStaffChange({ id: ID, name: 'Raj', pin: '4321' })).toEqual({ ok: true, value: { id: ID, name: 'Raj', pin: '4321' } });
    expect(parseStaffChange({ id: ID, name: ' R ' }).ok).toBe(false);
  });

  it('refuses an empty change, a bad id or a bad PIN', () => {
    expect(parseStaffChange({ id: ID }).ok).toBe(false);
    expect(parseStaffChange({ id: 'nope', role: 'CHEF' }).ok).toBe(false);
    expect(parseStaffChange({ id: ID, pin: '12' }).ok).toBe(false);
  });
});

describe('what staff can never reach', () => {
  it('keeps the owner\'s staff, security and profile settings away from every staff role', () => {
    for (const role of ['WAITER', 'CHEF', 'CASHIER'] as const) {
      for (const [method, path] of [
        ['GET', '/api/host/staff/access'], ['PUT', '/api/host/staff/access'], ['GET', '/api/host/security/status'],
        ['PUT', '/api/host/settings/waiter-settle'], ['GET', '/api/host/expenses/staff'], ['POST', '/api/host/provision'],
      ] as const) {
        expect(staffMayCall(role, method, path)).toBe(false);
      }
    }
  });
});
