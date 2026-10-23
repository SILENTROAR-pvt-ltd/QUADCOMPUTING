import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { provisionRef } from './provision-ref';

describe('provisionRef', () => {
  it('names the database rule without any value the host entered', () => {
    const err = { code: '23514', message: 'new row for relation "profiles" violates check constraint "profiles_owner_cafe_id_format"', details: 'Failing row contains (secret, name)' };
    expect(provisionRef(err)).toBe('23514 profiles_owner_cafe_id_format');
    expect(provisionRef({ code: 'P0001', message: 'Could not find a unique slug for "The Mad kings" after 21 attempts' })).toBe('P0001');
    expect(provisionRef({ code: 'PGRST202', message: 'Could not find the function public.provision_host_business(p_x) in the schema cache' })).toBe('PGRST202');
  });

  it('marks a refused form, and gives nothing for an error with no code', () => {
    const form = z.object({ a: z.string() }).safeParse({});
    expect(provisionRef(form.success ? null : form.error)).toBe('FORM');
    expect(provisionRef(new Error('boom'))).toBeUndefined();
  });
});
