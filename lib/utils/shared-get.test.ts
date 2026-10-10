import { describe, it, expect, vi, afterEach } from 'vitest';
import { sharedGet } from './shared-get';

afterEach(() => { vi.unstubAllGlobals(); });

const jsonResponse = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe('sharedGet', () => {
  it('sends one request for concurrent reads of the same URL', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ sessions: { 'T-01': {} } }));
    vi.stubGlobal('fetch', fetchMock);

    const [a, b, c] = await Promise.all([
      sharedGet('/api/host/sessions'),
      sharedGet('/api/host/sessions'),
      sharedGet('/api/host/sessions'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ ok: true, data: { sessions: { 'T-01': {} } } });
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });

  it('does not reuse an answer once the request has settled', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ n: 1 }))
      .mockResolvedValueOnce(jsonResponse({ n: 2 }));
    vi.stubGlobal('fetch', fetchMock);

    expect((await sharedGet('/api/x')).data).toEqual({ n: 1 });
    expect((await sharedGet('/api/x')).data).toEqual({ n: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports a failed response without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'nope' }, false)));
    expect(await sharedGet('/api/y')).toEqual({ ok: false, data: null });
  });

  it('reports a network failure without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    expect(await sharedGet('/api/z')).toEqual({ ok: false, data: null });
  });
});
