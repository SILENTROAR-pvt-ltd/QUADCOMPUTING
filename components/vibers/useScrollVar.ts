'use client';

import { useEffect, type RefObject } from 'react';

/** Where the reader is relative to an element, from its box and the screen height; clamped to 0..1 by the hook. */
export type ScrollMeasure = (box: DOMRect, vh: number) => number;

/**
 * Writes the reader's progress through an element to a CSS variable on it (default --p, 0 to 1): at most once a frame,
 * only when the value changes, and without re-rendering. The scroll is listened to only while the element is near the
 * screen; elsewhere the page scrolls with nothing attached. With reduced motion nothing is written, so whatever the
 * markup sets (the finished state) holds. `measure` must be stable (declare it outside the component).
 */
export function useScrollVar(ref: RefObject<HTMLElement | null>, measure: ScrollMeasure, name = '--p') {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    let last = '';
    const update = () => {
      frame = 0;
      const p = Math.min(1, Math.max(0, measure(el.getBoundingClientRect(), window.innerHeight))).toFixed(3);
      if (p !== last) { last = p; el.style.setProperty(name, p); }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    let listening = false;
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) { window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); onScroll(); }
      else { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); }
    };
    update();
    const io = new IntersectionObserver(([e]) => { listen(e.isIntersecting); if (!e.isIntersecting) update(); }, { rootMargin: '50% 0px' });
    io.observe(el);
    return () => { io.disconnect(); listen(false); if (frame) cancelAnimationFrame(frame); };
  }, [ref, measure, name]);
}
