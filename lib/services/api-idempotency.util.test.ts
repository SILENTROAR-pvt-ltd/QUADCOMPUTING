import { describe, it, expect } from 'vitest';
import { generateIdempotencyKey, withIdempotency } from './api-idempotency.util';

describe('idempotency key', () => {
  it('uses the client key when one is sent', () => {
    expect(generateIdempotencyKey('guest_order', 'biz:T-01', { idempotency_key: 'go-1', items: [] })).toBe('guest_order:go-1');
  });

  it('tells apart two different carts of the same length', () => {
    const a = generateIdempotencyKey('guest_order', 'biz:T-01', { items: [{ id: 'aaaa', quantity: 1 }] });
    const b = generateIdempotencyKey('guest_order', 'biz:T-01', { items: [{ id: 'bbbb', quantity: 1 }] });
    expect(a).not.toBe(b);
  });

  it('gives the same key for the same cart', () => {
    const body = { items: [{ id: 'aaaa', quantity: 1 }] };
    expect(generateIdempotencyKey('guest_order', 'biz:T-01', body)).toBe(generateIdempotencyKey('guest_order', 'biz:T-01', { ...body }));
  });

  it('runs a duplicate in-flight request once', async () => {
    let runs = 0;
    const work = async () => { runs++; await new Promise((r) => setTimeout(r, 20)); return { response: { ok: true } }; };
    const key = 'guest_order:dup-test';
    await Promise.all([withIdempotency(key, work), withIdempotency(key, work)]);
    expect(runs).toBe(1);
  });
});
