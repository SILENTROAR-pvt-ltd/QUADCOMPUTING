'use client';

import { useCallback, useState } from 'react';
import { categoryKey } from './useCategorySpy';

/** Which category bars are open. Every bar starts closed, so a long menu reads as a short list of categories. */
export function useOpenCategories() {
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = useCallback((cat: string) => setOpened((prev) => {
    const next = new Set(prev);
    const key = categoryKey(cat);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  }), []);
  const open = useCallback((cat: string) => setOpened((prev) => (prev.has(categoryKey(cat)) ? prev : new Set(prev).add(categoryKey(cat)))), []);
  const openAll = useCallback((cats: string[]) => setOpened(new Set(cats.map(categoryKey))), []);
  const closeAll = useCallback(() => setOpened(new Set()), []);

  return { opened, toggle, open, openAll, closeAll };
}
