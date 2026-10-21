'use client';

import { useLayoutEffect, useState } from 'react';
import { readJsonSeed } from './menu-seed';

/**
 * A seed this browser kept, read right after mount. It is null on the server and on the first client render, so the
 * HTML the server sent and the first client render agree (reading sessionStorage during render made them differ and
 * React threw the page away and drew it again); the layout effect then reads it before the first paint, so the page
 * still opens from it with nothing visible in between. A new key is read again; a null key reads nothing.
 */
export function useClientSeed<T>(key: string | null, read: (key: string) => T | null): T | null {
  const [seed, setSeed] = useState<T | null>(null);
  useLayoutEffect(() => { setSeed(key ? read(key) : null); }, [key, read]);
  return seed;
}

/** The JSON answer kept for this URL (see prefetchJson), read the same way. */
export const useJsonSeed = <T,>(url: string | null): T | null => useClientSeed<T>(url, readJsonSeed);
