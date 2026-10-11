import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

import { clubDb, member, seedMembers } from './fakes';
import { hashPin } from '@/lib/auth/guest-auth';
import { applyToClub } from '@/lib/club/membership/apply.service';
import { approveApplication, rejectApplication } from '@/lib/club/membership/review.service';
import { toPublicMember } from '@/lib/club/membership/members';

const USER = '33333333-aaaa-4bbb-8ccc-000000000001';
const STAFF = '33333333-aaaa-4bbb-8ccc-0000000000ff';
const PHONE = '919876543210';
const NOW = new Date('2026-10-11T12:00:00Z');

const form = (over: Record<string, unknown> = {}) => ({
  dob: '1999-04-01', city: 'Goa', state: 'Goa', country: 'India', phone: '9876543210', display_name: 'Asha Rao', viber_id: 'asha', ...over,
});

function db(extra: Record<string, any[]> = {}, verified = true) {
  return clubDb({
    viber_profiles: [], viber_profile_categories: [], vibers_accounts: [], guest_accounts: [], guest_wallets: [], guest_wallet_claims: [],
    club_campaigns: [{ id: 'c1', code: 'goa-posters-a1b2c3', label: 'Goa posters', active: true }, { id: 'c0', code: 'old-code', label: 'Old', active: false }],
    business_categories: [{ id: 'cat-cafe', slug: 'cafe', label: 'Cafe', active: true }, { id: 'cat-bar', slug: 'bar', label: 'Bar', active: false }],
    club_phone_otps: verified ? [{ id: 'o1', user_id: USER, phone: PHONE, code_hash: 'x', attempts: 0, expires_at: NOW.toISOString(), consumed_at: new Date(NOW.getTime() - 60_000).toISOString(), created_at: NOW.toISOString() }] : [],
    club_notifications: [], club_moderation_log: [],
    ...extra,
  });
}

describe('Applying to Vibers Club (same login and @handle as QC)', () => {
  it('creates the shared Vibers account and a pending application', async () => {
    const d = db();
    const profile = await applyToClub(d, USER, { ...form(), campaign: 'goa-posters-a1b2c3' }, NOW);
    expect(profile).toMatchObject({ user_id: USER, viber_id: '@asha', status: 'pending', generation: 'gen_z', phone: PHONE, campaign_source: 'goa-posters-a1b2c3' });
    expect(d.tables.vibers_accounts[0]).toMatchObject({ user_id: USER, handle: '@asha', display_name: 'Asha Rao' });
  });

  it('someone who already has a Vibers account keeps their @handle as the Viber ID', async () => {
    const d = db({ vibers_accounts: [{ user_id: USER, handle: '@asha_qc', display_name: 'Asha', phone: PHONE }] });
    const profile = await applyToClub(d, USER, form({ viber_id: 'something_else' }), NOW);
    expect(profile.viber_id).toBe('@asha_qc');
    expect(d.tables.vibers_accounts).toHaveLength(1);
  });

  it('needs a phone verified by OTP in the last 30 minutes', async () => {
    await expect(applyToClub(db({}, false), USER, form(), NOW)).rejects.toMatchObject({ code: 'phone_unverified' });
  });

  it('a handle with an old PIN account asks for that PIN, then links it', async () => {
    const pin = await hashPin('123456');
    const legacy = { id: 'g1', business_id: 'b1', user_id: null, handle: '@asha', display_name: 'Asha', pin_hash: pin.hash, pin_salt: pin.salt, failed_attempts: 0, locked_until: null };
    const d = db({ guest_accounts: [legacy] });
    await expect(applyToClub(d, USER, form(), NOW)).rejects.toMatchObject({ status: 409, code: 'legacy_pin_required' });
    const profile = await applyToClub(d, USER, form({ legacy_pin: '123456' }), NOW);
    expect(profile.viber_id).toBe('@asha');
    expect(d.tables.guest_accounts[0].user_id).toBe(USER);
  });

  it('business applications need active categories; retired campaigns are not counted', async () => {
    const d = db();
    await expect(applyToClub(d, USER, form({ account_type: 'business', business_name: 'Sea Shack', categories: ['bar'] }), NOW)).rejects.toMatchObject({ status: 400 });
    const profile = await applyToClub(d, USER, form({ account_type: 'business', business_name: 'Sea Shack', categories: ['cafe'], campaign: 'old-code' }), NOW);
    expect(profile).toMatchObject({ account_type: 'business', campaign_source: null });
    expect(d.tables.viber_profile_categories).toHaveLength(1);
    expect(d.tables.viber_profile_categories[0]).toMatchObject({ user_id: USER, category_id: 'cat-cafe' });
  });

  it('one application at a time; a rejected applicant may apply again, a revoked one may not', async () => {
    const d = db();
    await applyToClub(d, USER, form(), NOW);
    await expect(applyToClub(d, USER, form(), NOW)).rejects.toMatchObject({ code: 'already_applied' });
    d.tables.viber_profiles[0].status = 'rejected';
    expect((await applyToClub(d, USER, form({ city: 'Pune' }), NOW)).status).toBe('pending');
    d.tables.viber_profiles[0].status = 'revoked';
    await expect(applyToClub(d, USER, form(), NOW)).rejects.toMatchObject({ code: 'revoked' });
  });
});

describe('Reviewing applications', () => {
  it('approval issues a unique Viber Pass and tells the member', async () => {
    const m = member(USER, '@asha', { status: 'pending' });
    const d = db(seedMembers(m));
    const approved = await approveApplication(d, STAFF, USER);
    expect(approved.status).toBe('approved');
    expect(approved.pass_number).toMatch(/^VC-\d{4}-[A-Z2-9]{6}$/);
    expect(d.tables.club_notifications[0]).toMatchObject({ user_id: USER, link: '/club/pass' });
    expect(d.tables.club_moderation_log[0]).toMatchObject({ actor_id: STAFF, action: 'approve_application' });
    await expect(approveApplication(d, STAFF, USER)).rejects.toMatchObject({ status: 409 });
  });

  it('rejection needs a reason the applicant can read', async () => {
    const d = db(seedMembers(member(USER, '@asha', { status: 'pending' })));
    await expect(rejectApplication(d, STAFF, USER, '')).rejects.toMatchObject({ status: 400 });
    await rejectApplication(d, STAFF, USER, 'Please add a real city.');
    expect(d.tables.viber_profiles[0]).toMatchObject({ status: 'rejected', review_note: 'Please add a real city.' });
  });
});

describe('What members see of each other', () => {
  it('a masked member shows only their club name, never their Viber ID or real name', () => {
    const p = member(USER, '@asha', { alias: 'Night Owl', alias_masked: true }).profile as any;
    expect(toPublicMember(p, 'Asha Rao')).toMatchObject({ name: 'Night Owl', viber_id: null });
    expect(toPublicMember({ ...p, alias_masked: false, alias: null }, 'Asha Rao')).toMatchObject({ name: 'Asha Rao', viber_id: '@asha' });
  });
});
