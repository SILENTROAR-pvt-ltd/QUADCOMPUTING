// API errors reach the browser only when a person can act on them. Database and runtime details never do.
import { describe, expect, it, vi } from 'vitest';
import { isInternalError, safeMessage } from './safe-message';

describe('safeMessage', () => {
  it('keeps a validation message the caller can act on', () => {
    expect(safeMessage(new Error('Invalid table format. Must be 1-12 characters.'), 'Failed')).toBe('Invalid table format. Must be 1-12 characters.');
    expect(safeMessage(new Error('Venue not found'), 'Failed')).toBe('Venue not found');
  });

  it('hides database errors, by code, by hint or by wording', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(safeMessage({ message: 'relation "orders" does not exist', code: '42P01' }, 'Failed')).toBe('Failed');
    expect(safeMessage({ message: 'x', code: 'PGRST204' }, 'Failed')).toBe('Failed');
    expect(safeMessage({ message: 'x', hint: 'Perhaps you meant column "a"' }, 'Failed')).toBe('Failed');
    expect(safeMessage(new Error('duplicate key value violates unique constraint "orders_idempotency_key"'), 'Failed')).toBe('Failed');
    expect(safeMessage(new Error('TypeError: fetch failed'), 'Failed')).toBe('Failed');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('uses the fallback for a missing message, and trims a long one', () => {
    expect(safeMessage(null)).toBe('Internal Server Error');
    expect(safeMessage({}, 'Nope')).toBe('Nope');
    expect(safeMessage(new Error('a'.repeat(500)), 'x')).toHaveLength(300);
  });

  it('classifies errors', () => {
    expect(isInternalError({ code: '23505', message: 'x' })).toBe(true);
    expect(isInternalError(new Error('Missing table_number'))).toBe(false);
  });
});
