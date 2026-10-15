import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

const ctx = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db, getAdminClient: () => ctx.db }));
vi.mock('@/lib/services/guest-auth/vibers-connect.service', () => ({ signedInUser: async () => ctx.user }));

import { GET } from '@/app/api/guest/auth/handle-check/route';

const ME = 'user-me';
const OTHER = 'user-other';
let ip = 1;
const check = (handle: string) =>
  GET(new Request(`http://localhost/api/guest/auth/handle-check?handle=${encodeURIComponent(handle)}`, { headers: { 'x-forwarded-for': `203.0.113.${ip++}` } }));

describe('handle check', () => {
  beforeEach(() => {
    ctx.user = { id: ME, email: 'me@example.com' };
    ctx.db = createFakeSupabase({
      vibers_accounts: [{ user_id: OTHER, handle: '@taken' }, { user_id: ME, handle: '@mine' }],
      guest_accounts: [{ id: 'g1', user_id: null, handle: '@oldpin' }, { id: 'g2', user_id: OTHER, handle: '@linked' }],
    });
  });

  it('is for signed-in people only', async () => {
    ctx.user = null;
    expect((await check('free')).status).toBe(401);
  });

  it('reports free, taken, taken-by-a-linked-guest, old-PIN and invalid handles', async () => {
    expect((await (await check('free_name')).json()).status).toBe('available');
    expect((await (await check('@Taken')).json()).status).toBe('taken');
    expect((await (await check('linked')).json()).status).toBe('taken');
    expect((await (await check('oldpin')).json()).status).toBe('legacy');
    expect((await (await check('x')).json()).status).toBe('invalid');
  });

  it('treats the person\'s own handle as available to them', async () => {
    expect((await (await check('mine')).json()).status).toBe('available');
  });
});
