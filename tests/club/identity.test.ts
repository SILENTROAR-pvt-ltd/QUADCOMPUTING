import { describe, it, expect } from 'vitest';
import { ageOn, checkAlias, checkViberId, generationOf } from '@/lib/club/identity/identity-rules';
import { containsProfanity, maskProfanity } from '@/lib/club/identity/profanity';
import { parseApplication } from '@/lib/club/membership/application-input';

const NOW = new Date('2026-10-11T12:00:00Z');
const base = {
  dob: '2000-01-15', city: 'Goa', state: 'Goa', country: 'India', phone: '9876543210', display_name: 'Asha Rao', viber_id: 'asha',
};

describe('Age gate and generation tag', () => {
  it('counts whole years and turns 18 exactly on the birthday', () => {
    expect(ageOn('2008-10-11', NOW)).toBe(18);
    expect(ageOn('2008-10-12', NOW)).toBe(17);
    expect(ageOn('2026-02-30', NOW)).toBeNull();
    expect(ageOn('2030-01-01', NOW)).toBeNull();
  });

  it('maps birth years to generations', () => {
    expect(generationOf('2010-01-01')).toBe('gen_z');
    expect(generationOf('1997-01-01')).toBe('gen_z');
    expect(generationOf('1996-12-31')).toBe('millennial');
    expect(generationOf('1975-06-01')).toBe('gen_x');
    expect(generationOf('1960-06-01')).toBe('boomer');
  });

  it('refuses anyone under 18, before anything else is checked', () => {
    expect(parseApplication({ ...base, dob: '2009-01-01' }, NOW)).toMatchObject({ ok: false, status: 403, code: 'under_18' });
    expect(parseApplication({ ...base, dob: 'not a date' }, NOW)).toMatchObject({ ok: false, status: 400 });
  });
});

describe('Viber ID and club name', () => {
  it('is the shared @handle format, lowercase, with no dots', () => {
    expect(checkViberId('Asha_99')).toEqual({ ok: true, viberId: '@asha_99' });
    expect(checkViberId('@asha')).toEqual({ ok: true, viberId: '@asha' });
    expect(checkViberId('asha.rao')).toMatchObject({ ok: false });
    expect(checkViberId('a')).toMatchObject({ ok: false });
  });

  it('refuses reserved words and profanity', () => {
    expect(checkViberId('admin')).toMatchObject({ ok: false });
    expect(checkViberId('vibers_club')).toMatchObject({ ok: false });
    expect(checkViberId('xfuckx')).toMatchObject({ ok: false });
  });

  it('cleans the alias and refuses one that could pose as a handle or is abusive', () => {
    expect(checkAlias('  Night Owl ')).toEqual({ ok: true, alias: 'Night Owl' });
    expect(checkAlias('@owl')).toEqual({ ok: true, alias: 'owl' });
    expect(checkAlias('')).toEqual({ ok: true, alias: null });
    expect(checkAlias('ch0tiya')).toMatchObject({ ok: true });
    expect(checkAlias('chutiya')).toMatchObject({ ok: false });
  });
});

describe('Red Flag Protocol profanity filter', () => {
  it('catches disguised words', () => {
    expect(containsProfanity('f.u.c.k this')).toBe(true);
    expect(containsProfanity('sh1t')).toBe(true);
    expect(containsProfanity('BHENCHOD')).toBe(true);
  });

  it('leaves ordinary words alone', () => {
    for (const ok of ['my therapist said hi', 'reading Dickens', 'a grandiose plan', 'Scunthorpe', 'cocktail night', 'Gandhi road']) {
      expect(containsProfanity(ok)).toBe(false);
    }
  });

  it('stars out bad words in chat but keeps the rest', () => {
    expect(maskProfanity('this is shit honestly')).toBe('this is s*** honestly');
    expect(maskProfanity('great vibes')).toBe('great vibes');
  });
});

describe('Application form', () => {
  it('a viber application keeps no business fields', () => {
    const r = parseApplication({ ...base, account_type: 'viber', business_name: 'X', categories: ['cafe'] }, NOW);
    expect(r).toMatchObject({ ok: true, input: { accountType: 'viber', businessName: null, categorySlugs: [], phone: '919876543210', generation: 'gen_z' } });
  });

  it('a business application needs a name and at least one category', () => {
    expect(parseApplication({ ...base, account_type: 'business' }, NOW)).toMatchObject({ ok: false });
    expect(parseApplication({ ...base, account_type: 'business', business_name: 'Sea Shack', categories: [] }, NOW)).toMatchObject({ ok: false });
    expect(parseApplication({ ...base, account_type: 'business', business_name: 'Sea Shack', categories: ['Cafe', 'hotel', 'cafe'] }, NOW))
      .toMatchObject({ ok: true, input: { categorySlugs: ['cafe', 'hotel'] } });
  });

  it('masking needs an alias', () => {
    expect(parseApplication({ ...base, alias_masked: true }, NOW)).toMatchObject({ ok: true, input: { aliasMasked: false } });
    expect(parseApplication({ ...base, alias: 'Owl', alias_masked: true }, NOW)).toMatchObject({ ok: true, input: { aliasMasked: true } });
  });
});
