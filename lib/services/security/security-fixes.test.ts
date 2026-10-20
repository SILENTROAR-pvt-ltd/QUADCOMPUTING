import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkPin, encodePin } from './venue-pin';
import { masterUnlockRequired } from './master-unlock-guard';
import { issueMasterUnlock, MASTER_UNLOCK_COOKIE } from './master-unlock';
import { guestSafeOrder } from '../guest-order/guest-safe-order.util';

describe('venue PIN: a hash derived from the retired default is not a key', () => {
  it("refuses '0000' even when a hash of it is stored, and keeps real PINs working", async () => {
    const row = { admin_pin_hash: await encodePin('0000') };
    expect((await checkPin(row, 'admin', '0000')).ok).toBe(false);
    const real = { admin_pin_hash: await encodePin('4821') };
    expect((await checkPin(real, 'admin', '4821')).ok).toBe(true);
    expect((await checkPin(real, 'admin', '1111')).ok).toBe(false);
  });
});

describe('owner writes behind the master PIN', () => {
  let saved: string | undefined;
  beforeEach(() => { saved = process.env.STAFF_SESSION_SECRET; process.env.STAFF_SESSION_SECRET = 'test-secret-security-fixes'; });
  afterEach(() => { if (saved === undefined) delete process.env.STAFF_SESSION_SECRET; else process.env.STAFF_SESSION_SECRET = saved; });

  const auth = (business: object) => ({ user: { id: 'owner-1' }, businessId: 'biz-1', business });
  const req = (cookie?: string) => new Request('http://x/api/host/wallet', { method: 'POST', headers: cookie ? { cookie } : {} });

  it('does nothing when the venue has no master PIN', () => {
    expect(masterUnlockRequired(req(), auth({ id: 'biz-1' }))).toBeNull();
  });

  it('refuses without the unlock cookie when a master PIN is set', async () => {
    const res = masterUnlockRequired(req(), auth({ id: 'biz-1', admin_pin_hash: await encodePin('4821') }));
    expect(res?.status).toBe(403);
    expect(await res?.json()).toMatchObject({ code: 'MASTER_UNLOCK_REQUIRED' });
  });

  it('allows the owner who holds a valid unlock cookie for this venue', async () => {
    const token = issueMasterUnlock('owner-1', 'biz-1');
    const res = masterUnlockRequired(req(`${MASTER_UNLOCK_COOKIE}=${token}`), auth({ id: 'biz-1', admin_pin_hash: await encodePin('4821') }));
    expect(res).toBeNull();
  });

  it('refuses another owner presenting the same cookie', async () => {
    const token = issueMasterUnlock('owner-2', 'biz-1');
    const res = masterUnlockRequired(req(`${MASTER_UNLOCK_COOKIE}=${token}`), auth({ id: 'biz-1', admin_pin_hash: await encodePin('4821') }));
    expect(res?.status).toBe(403);
  });
});

describe('guest-facing order projection', () => {
  it('removes the customer name, phone and the replay key, and keeps the rest', () => {
    const out = guestSafeOrder({ id: 'o1', status: 'open', customer_name: 'Asha', customer_phone: '9999', idempotency_key: 'go-secret' });
    expect(out).toEqual({ id: 'o1', status: 'open' });
    expect(guestSafeOrder(null)).toBeNull();
  });
});
