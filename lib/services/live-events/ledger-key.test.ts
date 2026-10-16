import { describe, expect, it } from 'vitest';
import { ledgerKeyFor, recordLedgerVisit } from './ledger.service';

/** A ledger fake: returns no existing row, and records every rpc call. */
function fake() {
  const rpcs: Array<{ name: string; args: any }> = [];
  const chain: any = {};
  chain.select = () => chain; chain.eq = () => chain; chain.or = () => chain; chain.order = () => chain;
  chain.limit = async () => ({ data: [], error: null });
  const db = {
    from: () => chain,
    rpc: async (name: string, args: any) => { rpcs.push({ name, args }); return { data: true, error: null }; },
  };
  return { db, rpcs };
}

describe('who a paying guest is', () => {
  it('signed-in guests are keyed by their handle', async () => {
    expect(await ledgerKeyFor(fake().db, 'b', { handle: '@asha', name: 'Asha' }, 'o1')).toBe('h:@asha');
  });

  it('a guest with a phone number is keyed by the phone', async () => {
    expect(await ledgerKeyFor(fake().db, 'b', { phone: '+91 98765 43210', name: 'Ravi' }, 'o1')).toBe('p:9876543210');
  });

  it('a walk-in with only a name is one guest per name at the venue', async () => {
    expect(await ledgerKeyFor(fake().db, 'b', { name: '  Ravi   Kumar ' }, 'o1')).toBe('n:ravi kumar');
    expect(await ledgerKeyFor(fake().db, 'b', { name: 'ravi kumar' }, 'o2')).toBe('n:ravi kumar');
  });

  it('a walk-in with no name at all is one guest per bill', async () => {
    expect(await ledgerKeyFor(fake().db, 'b', { name: 'Guest' }, 'order-9')).toBe('o:order-9');
    expect(await ledgerKeyFor(fake().db, 'b', {}, 'order-9')).toBe('o:order-9');
  });
});

describe('recording a settled bill', () => {
  it('records every bill with its own order id, so a repeat cannot count twice', async () => {
    const { db, rpcs } = fake();
    await recordLedgerVisit(db, 'biz', 'order-1', { name: 'Ravi Kumar' }, 740, '2026-10-16T07:00:00Z');
    await recordLedgerVisit(db, 'biz', 'order-1', { name: 'Ravi Kumar' }, 740, '2026-10-16T07:00:00Z');
    expect(rpcs).toHaveLength(2);
    expect(rpcs[0].name).toBe('ledger_record_visit');
    expect(rpcs[0].args).toMatchObject({ p_order_id: 'order-1', p_guest_key: 'n:ravi kumar', p_guest_name: 'Ravi Kumar', p_spend: 740, p_at: '2026-10-16T07:00:00Z' });
  });

  it('a walk-in with no name gets the walk-in label, not "Guest"', async () => {
    const { db, rpcs } = fake();
    await recordLedgerVisit(db, 'biz', 'order-2', { name: 'Guest' }, 120);
    expect(rpcs[0].args).toMatchObject({ p_guest_key: 'o:order-2', p_guest_name: 'Walk-in guest' });
  });

  it('does nothing without a bill to attach the visit to', async () => {
    const { db, rpcs } = fake();
    await recordLedgerVisit(db, 'biz', null, { name: 'Ravi' }, 100);
    expect(rpcs).toHaveLength(0);
  });
});
