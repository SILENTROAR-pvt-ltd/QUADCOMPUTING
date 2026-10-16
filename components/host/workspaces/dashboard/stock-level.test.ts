import { describe, expect, it } from 'vitest';
import { levelOf } from './StockAlertsCard';

describe('stock level', () => {
  it('is out at zero or below, critical at half the reorder level or less, low up to the reorder level', () => {
    expect(levelOf(0, 5)).toBe('out');
    expect(levelOf(-1, 5)).toBe('out');
    expect(levelOf(2.5, 5)).toBe('critical');
    expect(levelOf(2, 5)).toBe('critical');
    expect(levelOf(3, 5)).toBe('low');
    expect(levelOf(5, 5)).toBe('low');
  });
});
