import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHostAccount } from './create-host-account';

// The browser client and the two endpoints the sign-up calls, all faked: no network, no real Supabase.
const auth = vi.hoisted(() => ({ getUser: vi.fn(), signOut: vi.fn(), signUp: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth }) }));

const memory = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null), setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: (i: number) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
};

const form = (email: string) => ({
  fullName: 'New Owner', email, password: 'longenough1', gender: 'male' as const, dob: '1990-01-01', categories: ['cafe'],
  businesses: [{ businessName: 'The Mad kings', pincode: '175131', state: 'Himachal Pradesh', city: 'Old Manali', address: 'Old Manali Village' }],
});

let calls: string[];
beforeEach(() => {
  vi.stubGlobal('sessionStorage', memory());
  vi.stubGlobal('localStorage', memory());
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(url);
    const body = url.includes('host-access') ? { isHost: true } : { success: true, controlCenterUrl: '/host/control-center?business_id=new' };
    return new Response(JSON.stringify(body), { status: 200 });
  }));
  auth.getUser.mockReset(); auth.signOut.mockReset(); auth.signUp.mockReset();
  auth.signOut.mockResolvedValue({ error: null });
  auth.signUp.mockResolvedValue({ data: { user: { id: 'new-user', identities: [{}] }, session: { access_token: 't' } }, error: null });
});

describe('host sign-up and the login already on this browser', () => {
  it('never attaches the new venue to a different owner who is signed in: it creates the typed account', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'owner-a', email: 'bombayrasoi@gmail.com' } }, error: null });
    sessionStorage.setItem('master_admin_unlocked', 'venue-a');
    localStorage.setItem('pos_catalog_cache_venue-a', '[]');
    const result = await createHostAccount(form('madkings@example.com') as any);
    expect(result.ok).toBe(true);
    expect(auth.signOut).toHaveBeenCalled();
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'madkings@example.com', password: 'longenough1' });
    expect(calls).not.toContain('/api/auth/host-access');
    // The previous owner's unlocked PIN and cached menu do not survive into the new account.
    expect(sessionStorage.getItem('master_admin_unlocked')).toBeNull();
    expect(localStorage.getItem('pos_catalog_cache_venue-a')).toBeNull();
  });

  it('adds the venue to the signed-in owner when they typed their own email', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'owner-a', email: 'Owner@Example.com' } }, error: null });
    const result = await createHostAccount(form('owner@example.com') as any);
    expect(result.ok).toBe(true);
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(calls).toEqual(['/api/auth/host-access', '/api/host/provision']);
  });

  it('retries under the account this sign-up just created, without asking again', async () => {
    sessionStorage.setItem('quad-new-host-user', 'new-user');
    auth.getUser.mockResolvedValue({ data: { user: { id: 'new-user', email: 'madkings@example.com' } }, error: null });
    await createHostAccount(form('madkings@example.com') as any);
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(calls).toEqual(['/api/host/provision']);
  });
});
