'use client';

import { useEffect, useRef, useState } from 'react';

/** A number that glides to its new value (about half a second, easing out) instead of jumping; instant with reduced motion. */
export function useCountUp(target: number, ms = 550) {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); from.current = target; return; }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const v = start + (target - start) * (1 - Math.pow(1 - t, 3));
      from.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return value;
}
