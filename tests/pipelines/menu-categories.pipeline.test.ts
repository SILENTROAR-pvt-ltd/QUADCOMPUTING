import { describe, it, expect } from 'vitest';
import { sortCulinaryCategories } from '@/lib/utils/menu-categories';
import { sortCulinaryCategories as guestSort, culinaryTabs } from '@/components/guest/menu/hooks/menu-category.util';

describe('Menu categories are one list for the host and the guest', () => {
  const names = new Set(['Sandwiches', 'Quick Bites', 'Beverages', 'Starters', 'Dals & Lentils', '  ', 'Shakes']);

  it('the guest menu uses the same function and order as the host catalog', () => {
    expect(guestSort).toBe(sortCulinaryCategories);
    expect(culinaryTabs(names)).toEqual(['Dining', ...sortCulinaryCategories(names)]);
  });

  it('puts the usual dining categories first, then the rest A to Z, and drops blanks', () => {
    expect(sortCulinaryCategories(names)).toEqual(['Starters', 'Beverages', 'Dals & Lentils', 'Quick Bites', 'Sandwiches', 'Shakes']);
  });
});
