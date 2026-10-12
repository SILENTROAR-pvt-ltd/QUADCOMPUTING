'use client';

import { useEffect, useState } from 'react';

/** True on screens wide enough for the side-by-side layout (Tailwind `lg`, 1024 px and up). */
export function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return desktop;
}
