import { describe, it, expect, vi } from 'vitest';
import { adminAal2Failure, adminRequiresAal2 } from './admin-aal';

const supabaseAt = (result: { data?: unknown; error?: unknown } | Error) => {
  const getAuthenticatorAssuranceLevel = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  return { client: { auth: { mfa: { getAuthenticatorAssuranceLevel } } }, getAuthenticatorAssuranceLevel };
};

describe('admin AAL2 requirement', () => {
  it('is off unless ADMIN_REQUIRE_AAL2 is exactly 1', () => {
    expect(adminRequiresAal2({})).toBe(false);
    expect(adminRequiresAal2({ ADMIN_REQUIRE_AAL2: 'true' })).toBe(false);
    expect(adminRequiresAal2({ ADMIN_REQUIRE_AAL2: '1' })).toBe(true);
  });

  it('lets every admin through, without asking Supabase, while it is off', async () => {
    const { client, getAuthenticatorAssuranceLevel } = supabaseAt({ data: { currentLevel: 'aal1' }, error: null });
    expect(await adminAal2Failure(client, {})).toBeNull();
    expect(getAuthenticatorAssuranceLevel).not.toHaveBeenCalled();
  });

  it('refuses a password-only session when it is on', async () => {
    const { client } = supabaseAt({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null });
    const res = await adminAal2Failure(client, { ADMIN_REQUIRE_AAL2: '1' });
    expect(res?.status).toBe(403);
    expect(await res?.json()).toMatchObject({ code: 'AAL2_REQUIRED' });
  });

  it('admits a TOTP-verified session when it is on', async () => {
    const { client } = supabaseAt({ data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null });
    expect(await adminAal2Failure(client, { ADMIN_REQUIRE_AAL2: '1' })).toBeNull();
  });

  it('refuses when the level cannot be read, rather than admitting', async () => {
    const failing = supabaseAt({ data: null, error: { message: 'no session' } });
    expect((await adminAal2Failure(failing.client, { ADMIN_REQUIRE_AAL2: '1' }))?.status).toBe(403);
    const throwing = supabaseAt(new Error('network'));
    expect((await adminAal2Failure(throwing.client, { ADMIN_REQUIRE_AAL2: '1' }))?.status).toBe(403);
  });
});
