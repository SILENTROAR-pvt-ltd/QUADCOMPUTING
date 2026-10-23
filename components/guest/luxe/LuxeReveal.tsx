'use client';

import React, { useEffect, useRef, useState } from 'react';
import s from './luxe-guest.module.css';

/**
 * Brings a card into place once it is a little way into view, and leaves it there. Without JavaScript or with reduced
 * motion it simply shows: the hidden state is applied only once the observer is running, and only below the fold.
 */
export function LuxeReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'waiting' | 'shown'>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setState('waiting');
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setState('shown'); io.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-shown={state !== 'waiting'} className={`${state === 'idle' ? '' : s.rise} ${className}`}>
      {children}
    </div>
  );
}
