import { describe, it, expect } from 'vitest';
import { canonicalApiPath } from './api-path';

describe('canonicalApiPath', () => {
  it('maps a versioned path to the path its handler runs at', () => {
    expect(canonicalApiPath('/api/v1/host/sessions')).toBe('/api/host/sessions');
    expect(canonicalApiPath('/api/v1/guest/menu')).toBe('/api/guest/menu');
    expect(canonicalApiPath('/api/v1/admin/topup-requests')).toBe('/api/admin/topup-requests');
  });

  it('leaves unversioned paths and look-alike prefixes alone', () => {
    expect(canonicalApiPath('/api/host/sessions')).toBe('/api/host/sessions');
    expect(canonicalApiPath('/api/v10/host')).toBe('/api/v10/host');
    expect(canonicalApiPath('/api/v1x/host')).toBe('/api/v1x/host');
    expect(canonicalApiPath('/host/dashboard')).toBe('/host/dashboard');
  });
});
