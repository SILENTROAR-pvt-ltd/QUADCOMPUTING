import { describe, it, expect, vi, beforeEach } from 'vitest';

const account = vi.fn();
vi.mock('@/lib/services/guest-auth/guest-account.service', () => ({ accountForRequest: (...a: unknown[]) => account(...a) }));

import { applyRequestIdentity } from '@/lib/services/guest-auth/request-identity';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const req = new Request('http://localhost/api/guest/order', { method: 'POST' });
const keys = { name: 'guest_name', phone: 'guest_phone' };

beforeEach(() => account.mockReset());

describe('A guest request carries an account only when the guest is signed in', () => {
  it('drops a handle sent by a signed-out browser (new tab, shared phone, typed-in handle)', async () => {
    account.mockResolvedValue(null);
    const body: Record<string, any> = { guest_handle: '@bawa007', guest_name: 'Walk-in', items: [1] };
    expect(await applyRequestIdentity({}, req, BIZ, body, keys)).toBe(false);
    expect(body.guest_handle).toBeNull();
    expect(body.guest_name).toBe('Walk-in');
  });

  it('uses the signed-in account, never what the body claims', async () => {
    account.mockResolvedValue({ handle: '@harshit', display_name: 'Harshit', phone: '9876543210' });
    const body: Record<string, any> = { guest_handle: '@bawa007', guest_name: 'Someone else' };
    expect(await applyRequestIdentity({}, req, BIZ, body, keys)).toBe(true);
    expect(body).toMatchObject({ guest_handle: '@harshit', guest_name: 'Harshit', guest_phone: '9876543210' });
  });
});
