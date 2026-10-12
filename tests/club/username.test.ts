// The Club username: a public handle, separate from the shared Viber ID. Format, reserved and
// profane names, the 30-day change cooldown, and no name equal to a Viber handle.
import { describe, expect, it, vi } from 'vitest';
import { checkClubUsername, USERNAME_COOLDOWN_DAYS } from '@/lib/club/identity/identity-rules';
import { usernamePatch } from '@/lib/club/membership/username.service';
import { ClubError } from '@/lib/club/http';
import { clubDb, member, seedMembers } from './fakes';

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

const A = '11111111-aaaa-4bbb-8ccc-000000000001';
const B = '11111111-aaaa-4bbb-8ccc-000000000002';
const DAY = 86_400_000;
const NOW = new Date('2026-10-12T10:00:00Z');

function db(over: Record<string, unknown> = {}) {
  const a = member(A, '@asha', over);
  const b = member(B, '@bilal');
  return clubDb({ ...seedMembers(a, b) });
}

async function failure(p: Promise<unknown>): Promise<ClubError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ClubError) return e;
    throw e;
  }
  throw new Error('expected the change to be refused');
}

describe('checkClubUsername', () => {
  it('accepts 3–20 lowercase letters, digits or underscores, and normalises case and a leading @', () => {
    expect(checkClubUsername('Asha_Goa')).toEqual({ ok: true, username: 'asha_goa' });
    expect(checkClubUsername('@trail99')).toEqual({ ok: true, username: 'trail99' });
  });

  it('treats an empty value as clearing the username', () => {
    expect(checkClubUsername('')).toEqual({ ok: true, username: null });
    expect(checkClubUsername('   ')).toEqual({ ok: true, username: null });
    expect(checkClubUsername(null)).toEqual({ ok: true, username: null });
  });

  it('rejects names that are too short, too long, or contain other characters', () => {
    expect(checkClubUsername('ab').ok).toBe(false);
    expect(checkClubUsername('a'.repeat(21)).ok).toBe(false);
    expect(checkClubUsername('has space').ok).toBe(false);
    expect(checkClubUsername('dot.name').ok).toBe(false);
  });

  it('rejects reserved names, including with underscores removed', () => {
    expect(checkClubUsername('admin').ok).toBe(false);
    expect(checkClubUsername('vibers_club').ok).toBe(false);
    expect(checkClubUsername('quad_computing').ok).toBe(false);
  });
});

describe('usernamePatch', () => {
  it('a first username is set and starts the cooldown', async () => {
    const d = db();
    const patch = await usernamePatch(d, { club_username: null, username_changed_at: null }, 'asha_goa', NOW);
    expect(patch).toEqual({ club_username: 'asha_goa', username_changed_at: NOW.toISOString() });
  });

  it('an unchanged username writes nothing and does not start a cooldown', async () => {
    const d = db();
    const profile = { club_username: 'asha_goa', username_changed_at: new Date(NOW.getTime() - DAY).toISOString() };
    expect(await usernamePatch(d, profile, '@asha_goa', NOW)).toEqual({});
  });

  it('refuses a second change inside the cooldown, with the date it opens', async () => {
    const d = db();
    const changed = new Date(NOW.getTime() - DAY).toISOString();
    const err = await failure(usernamePatch(d, { club_username: 'asha_goa', username_changed_at: changed }, 'asha_trails', NOW));
    expect(err.status).toBe(409);
    expect(err.code).toBe('username_cooldown');
    expect(err.message).toContain('again on');
  });

  it('allows a change once the cooldown has passed', async () => {
    const d = db();
    const changed = new Date(NOW.getTime() - (USERNAME_COOLDOWN_DAYS + 1) * DAY).toISOString();
    const patch = await usernamePatch(d, { club_username: 'asha_goa', username_changed_at: changed }, 'asha_trails', NOW);
    expect(patch).toMatchObject({ club_username: 'asha_trails' });
  });

  it('refuses a name that is another member’s Viber handle, so nobody can pose as a Viber account', async () => {
    const d = db();
    const err = await failure(usernamePatch(d, { club_username: null, username_changed_at: null }, 'bilal', NOW));
    expect(err.status).toBe(409);
    expect(err.message).toContain('taken');
  });

  it('refuses a name that is the member’s own Viber handle too', async () => {
    const d = db();
    const err = await failure(usernamePatch(d, { club_username: null, username_changed_at: null }, 'asha', NOW));
    expect(err.status).toBe(409);
  });

  it('a Club username that is already in use is refused by the database', async () => {
    const d = clubDb({ ...seedMembers(member(A, '@asha', { club_username: 'trail_mix' }), member(B, '@bilal', { club_username: 'other' })) });
    await expect(d.from('viber_profiles').update({ club_username: 'trail_mix' }).eq('user_id', B).select('user_id').single())
      .resolves.toMatchObject({ error: { code: '23505' } });
  });
});
