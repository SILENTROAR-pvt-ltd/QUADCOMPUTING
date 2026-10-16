import { describe, expect, it } from 'vitest';
import { readWaiterCanSettle, writeWaiterCanSettle } from './waiter-settle-setting';

/** A fake client whose businesses row answers with `row` / `error` for both select and update. */
function db(row: any, error: any = null) {
  const chain: any = {};
  chain.select = () => chain;
  chain.update = () => chain;
  chain.eq = () => (chain._write ? Promise.resolve({ error }) : chain);
  chain.maybeSingle = async () => ({ data: row, error });
  return { from: () => chain, chain };
}

describe('the waiters-may-settle switch', () => {
  it('reads as on only when the owner turned it on', async () => {
    expect(await readWaiterCanSettle(db({ waiter_can_settle: true }), 'b')).toBe(true);
    expect(await readWaiterCanSettle(db({ waiter_can_settle: false }), 'b')).toBe(false);
    expect(await readWaiterCanSettle(db(null), 'b')).toBe(false);
  });

  it('reads as off when the setting cannot be read, so waiters send to billing', async () => {
    expect(await readWaiterCanSettle(db(null, { code: '42703', message: 'column does not exist' }), 'b')).toBe(false);
  });

  it('says what to do when the column has not been added yet', async () => {
    const d = db(null, { code: '42703', message: 'column businesses.waiter_can_settle does not exist' });
    d.chain._write = true;
    const out = await writeWaiterCanSettle(d, 'b', true);
    expect(out).toMatchObject({ ok: false, code: 'NOT_READY' });
  });

  it('saves the switch', async () => {
    const d = db(null);
    d.chain._write = true;
    expect(await writeWaiterCanSettle(d, 'b', true)).toEqual({ ok: true });
  });
});
