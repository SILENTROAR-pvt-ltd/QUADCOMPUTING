import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withIdempotency } from './api-idempotency.util';

// A stand-in for Upstash's REST API: the commands the window uses (GET, SET with NX/PX, DEL), one shared store.
// `failFrom` makes every call from that number on fail, to test a store that goes away.
function fakeSharedStore(failFrom = Infinity) {
  const data = new Map<string, string>();
  let calls = 0;
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    calls++;
    if (calls >= failFrom) throw new TypeError('fetch failed');
    const [cmd, key, value, ...rest] = JSON.parse(String(init.body)) as any[];
    const answer = (result: unknown) => new Response(JSON.stringify({ result }), { status: 200 });
    if (cmd === 'GET') return answer(data.has(key) ? data.get(key) : null);
    if (cmd === 'DEL') { data.delete(key); return answer(1); }
    if (cmd === 'SET') {
      if (rest.includes('NX') && data.has(key)) return answer(null);
      data.set(key, String(value));
      return answer('OK');
    }
    return new Response(JSON.stringify({ error: `unsupported ${cmd}` }), { status: 400 });
  });
  return { fetchMock, data };
}

const work = (counter: { runs: number }, response: unknown = { ok: true }) => async () => {
  counter.runs++;
  await new Promise((r) => setTimeout(r, 30));
  return { response, status: 201 };
};

describe('shared idempotency window (Upstash REST)', () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://shared.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('runs the work once when two instances race for the same key', async () => {
    vi.stubGlobal('fetch', fakeSharedStore().fetchMock);
    const counter = { runs: 0 };
    const key = 'guest_order:race-1';
    const [a, b] = await Promise.all([withIdempotency(key, work(counter)), withIdempotency(key, work(counter))]);

    expect(counter.runs).toBe(1);
    expect(a.response).toEqual({ ok: true });
    expect(b.response).toEqual({ ok: true });
    expect([a.duplicate, b.duplicate].filter(Boolean)).toHaveLength(1);
  });

  it('answers a retry that arrives after the run finished with the stored answer, without running again', async () => {
    vi.stubGlobal('fetch', fakeSharedStore().fetchMock);
    const counter = { runs: 0 };
    const key = 'guest_order:retry-1';
    await withIdempotency(key, work(counter, { order: 'first' }));
    const retry = await withIdempotency(key, work(counter, { order: 'second' }));

    expect(counter.runs).toBe(1);
    expect(retry.duplicate).toBe(true);
    expect(retry.response).toEqual({ order: 'first' });
    expect(retry.status).toBe(201);
  });

  it('releases the key when the run fails, so a retry runs at once', async () => {
    vi.stubGlobal('fetch', fakeSharedStore().fetchMock);
    const key = 'guest_order:fail-1';
    await expect(withIdempotency(key, async () => { throw new Error('kitchen down'); })).rejects.toThrow('kitchen down');

    const counter = { runs: 0 };
    const retry = await withIdempotency(key, work(counter));
    expect(counter.runs).toBe(1);
    expect(retry.duplicate).toBeFalsy();
  });

  it('falls back to this instance when the shared store cannot be reached before the work starts', async () => {
    vi.stubGlobal('fetch', fakeSharedStore(1).fetchMock);
    const counter = { runs: 0 };
    const res = await withIdempotency('guest_order:down-1', work(counter));

    expect(counter.runs).toBe(1);
    expect(res.response).toEqual({ ok: true });
    expect(console.warn).toHaveBeenCalled();
  });

  it('fails the request, rather than running it outside the store, when the store fails after the lock is taken', async () => {
    // Calls: 1 read the answer, 2 take the lock, 3 re-read the answer before running. Failing from 3 stops it before the work.
    vi.stubGlobal('fetch', fakeSharedStore(3).fetchMock);
    const counter = { runs: 0 };
    await expect(withIdempotency('guest_order:late-1', work(counter))).rejects.toThrow();
    expect(counter.runs).toBe(0);
  });

  it('does not run the work again when the store fails after the work has run', async () => {
    // Calls: 1 read, 2 lock, 3 re-read, then the work runs and storing its answer (call 4) fails.
    vi.stubGlobal('fetch', fakeSharedStore(4).fetchMock);
    const counter = { runs: 0 };
    const res = await withIdempotency('guest_order:after-1', work(counter));
    expect(counter.runs).toBe(1);
    expect(res.response).toEqual({ ok: true });
  });
});
