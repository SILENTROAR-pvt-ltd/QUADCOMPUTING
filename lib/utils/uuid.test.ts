import { describe, it, expect, vi, afterEach } from 'vitest';
import { newUuid } from './uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => { vi.unstubAllGlobals(); });

describe('newUuid', () => {
  it('makes a v4 uuid', () => {
    expect(newUuid()).toMatch(V4);
  });

  it('still works on a phone over plain http, where crypto.randomUUID does not exist', () => {
    vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array) => { for (let i = 0; i < a.length; i++) a[i] = (i * 37 + 11) % 256; return a; } });
    expect(newUuid()).toMatch(V4);
  });

  it('does not repeat', () => {
    expect(new Set(Array.from({ length: 50 }, newUuid)).size).toBe(50);
  });
});
