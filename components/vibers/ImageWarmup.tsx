'use client';

import { useEffect } from 'react';

const warm = (img: HTMLImageElement) => { img.loading = 'eager'; void img.decode?.().catch(() => {}); };

/**
 * Gets each lazy photo on the page fetched and decoded about two screens before it scrolls into view, so the first
 * paint of a large photo never lands in the middle of a scroll. Photos in a sideways rail (marked data-rail) are clipped
 * by it and would never count as near, so the rail is watched instead and warms all of its photos at once. Runs once
 * the page is idle; renders nothing.
 */
export function ImageWarmup({ root = '#vc-home' }: { root?: string }) {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    let io: IntersectionObserver | null = null;
    const start = () => {
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(`${root} img[loading="lazy"]`));
      const targets = new Set<Element>(imgs.map((img) => img.closest('[data-rail]') ?? img));
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io?.unobserve(e.target);
          if (e.target instanceof HTMLImageElement) warm(e.target);
          else e.target.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach(warm);
        }
      }, { rootMargin: '200% 0px' });
      targets.forEach((t) => io?.observe(t));
    };
    // Safari has no idle callback, so it falls back to a short timer.
    const hasIdle = typeof window.requestIdleCallback === 'function';
    const handle = hasIdle ? window.requestIdleCallback(start, { timeout: 2500 }) : window.setTimeout(start, 1200);
    return () => {
      io?.disconnect();
      if (hasIdle) window.cancelIdleCallback(handle); else clearTimeout(handle);
    };
  }, [root]);
  return null;
}
