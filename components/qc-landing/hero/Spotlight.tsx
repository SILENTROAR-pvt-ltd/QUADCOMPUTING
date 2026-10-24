'use client';

import React, { useEffect, useRef } from 'react';

/**
 * A soft gold light that follows the pointer across its parent (the dark hero), like a lamp over a counter. Only for a
 * mouse or trackpad, and never with reduced motion; it moves through CSS variables, so React does not re-render.
 */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host || !window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
        el.style.opacity = '1';
      });
    };
    const leave = () => { el.style.opacity = '0'; };
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(raf); host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); };
  }, []);
  return (
    <div ref={ref} aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-700"
      style={{ background: 'radial-gradient(520px circle at var(--mx, 50%) var(--my, 30%), rgba(217,193,147,0.13), transparent 70%)' }} />
  );
}
