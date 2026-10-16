import { describe, expect, it } from 'vitest';
import { resolveGuestKey } from './ledger.service';

/** A ledger fake that returns a fixed row and records the filter it was asked with. */
function ledger(existing: string | null) {
  const asked: string[] = [];
  const chain: any = {};
  chain.select = () => chain; chain.eq = () => chain; chain.order = () => chain;
  chain.or = (f: string) => { asked.push(f); return chain; };
  chain.limit = async () => ({ data: existing ? [{ guest_key: existing }] : [], error: null });
  return { db: { from: () => chain }, asked };
}

describe('one person, one ledger row', () => {
  it('reuses the key a guest already has when they come back with a different contact', async () => {
    const { db, asked } = ledger('p:9876543210');
    expect(await resolveGuestKey(db, 'b1', { email: 'asha@example.com' })).toBe('p:9876543210');
    expect(asked[0]).toContain('email.eq.asha@example.com');
  });

  it('uses the key their details give when nobody matches', async () => {
    expect(await resolveGuestKey(ledger(null).db, 'b1', { phone: '+91 98765 43210' })).toBe('p:9876543210');
  });

  it('has no key for a bare name', async () => {
    expect(await resolveGuestKey(ledger(null).db, 'b1', {})).toBeNull();
  });

  it('never puts a hostile value into the filter', async () => {
    const { db, asked } = ledger(null);
    await resolveGuestKey(db, 'b1', { email: 'a,b@x.com', phone: '9876543210' });
    expect(asked[0]).not.toContain('a,b');
  });
});
