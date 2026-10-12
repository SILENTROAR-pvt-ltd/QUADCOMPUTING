import { describe, it, expect } from 'vitest';
import { cleanBio, cleanSocialLinks, cleanTravelerKinds, MAX_BIO, normalizeHandle, SOCIAL_NETWORKS } from '@/lib/club/identity/profile-details';

describe('Bio', () => {
  it('keeps a few lines, tidied, and treats empty as no bio', () => {
    expect(cleanBio('  Slow trains.  \r\n\r\n\r\n\r\nChai first.  ')).toEqual({ ok: true, value: 'Slow trains.\n\nChai first.' });
    expect(cleanBio('   ')).toEqual({ ok: true, value: null });
    expect(cleanBio(null)).toEqual({ ok: true, value: null });
  });

  it('strips markup characters and refuses too long, too many lines, or non-text', () => {
    expect(cleanBio('<b>hi</b>')).toEqual({ ok: true, value: 'bhi/b' });
    expect(cleanBio('a'.repeat(MAX_BIO + 1)).ok).toBe(false);
    expect(cleanBio('1\n2\n3\n4\n5\n6').ok).toBe(false);
    expect(cleanBio(42).ok).toBe(false);
  });
});

describe('Traveller types', () => {
  it('accepts up to five types from the list, in a fixed order, without duplicates', () => {
    expect(cleanTravelerKinds(['volunteer', 'solo', 'solo'])).toEqual({ ok: true, value: ['solo', 'volunteer'] });
    expect(cleanTravelerKinds(undefined)).toEqual({ ok: true, value: [] });
  });

  it('refuses anything outside the list, more than five, or a non-list', () => {
    expect(cleanTravelerKinds(['astronaut']).ok).toBe(false);
    expect(cleanTravelerKinds(['solo', 'nomad', 'volunteer', 'influencer', 'creator', 'foodie']).ok).toBe(false);
    expect(cleanTravelerKinds('solo').ok).toBe(false);
  });
});

describe('Social handles', () => {
  it('drops a leading @ and reduces a pasted profile link to the handle', () => {
    expect(normalizeHandle('@wanderlust')).toBe('wanderlust');
    expect(normalizeHandle('https://www.instagram.com/wanderlust/?hl=en')).toBe('wanderlust');
  });

  it('keeps only the accounts that were filled in, as handles', () => {
    expect(cleanSocialLinks({ instagram: '@sandraaaa', youtube: '', x: '   ', website: '' })).toEqual({
      ok: true,
      value: { instagram: 'sandraaaa' },
    });
  });

  it('rejects a handle with the wrong shape, naming the network', () => {
    const res = cleanSocialLinks({ youtube: 'no' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('YouTube');
    expect(cleanSocialLinks({ x: 'this_handle_is_way_too_long' }).ok).toBe(false);
  });

  it('accepts the website only as a full https address', () => {
    expect(cleanSocialLinks({ website: 'https://example.com/travel' })).toEqual({ ok: true, value: { website: 'https://example.com/travel' } });
    expect(cleanSocialLinks({ website: 'example.com' }).ok).toBe(false);
    expect(cleanSocialLinks({ website: 'http://example.com' }).ok).toBe(false);
  });

  it('builds a public link for every network', () => {
    const links = Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n.key, n.kind === 'url' ? 'https://example.com' : 'sample']));
    expect(SOCIAL_NETWORKS.map((n) => n.link(links[n.key]!)).every((u) => u.startsWith('https://'))).toBe(true);
  });
});
