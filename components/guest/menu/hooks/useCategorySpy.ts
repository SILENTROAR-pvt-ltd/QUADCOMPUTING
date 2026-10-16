'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';

/** The lowercase key a category is matched by (the same one the filter chips use for their counts). */
export const categoryKey = (cat: string) => cat.trim().toLowerCase();
export const sectionId = (cat: string) => `menu-cat-${categoryKey(cat).replace(/[^a-z0-9]+/g, '-')}`;

/** A glide is over once the page has been still this long, or after the longest a glide may take. */
const JUMP_IDLE_MS = 140;
const JUMP_MAX_MS = 3000;
const ALL = 'Dining';

interface SpyOptions {
  /** Categories in the order their sections appear on the page. */
  categories: string[];
  /** Spying is off while a search is active: results are one flat list. */
  enabled: boolean;
  /** The sticky filter bar: sections are measured and scrolled to just below it. */
  stickyRef: RefObject<HTMLElement | null>;
  onActive: (category: string) => void;
}

/**
 * Keeps the category chips in step with the page. A native IntersectionObserver watches each section against a band just
 * under the sticky bar, so no scroll listener runs at all: the chip for the section at the top of the dishes lights up as
 * the guest scrolls. `jump` glides to a section and holds the highlight on it until it arrives, so it never flickers
 * through the chips on the way.
 */
export function useCategorySpy({ categories, enabled, stickyRef, onActive }: SpyOptions) {
  const lockedUntil = useRef(0);
  const latest = useRef(onActive);
  latest.current = onActive;
  const list = categories.join('\u0000');

  useEffect(() => {
    if (!enabled || categories.length < 2) return;
    const barHeight = stickyRef.current?.offsetHeight ?? 150;
    const inBand = new Set<string>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const cat = (e.target as HTMLElement).dataset.category ?? '';
        if (e.isIntersecting) inBand.add(cat); else inBand.delete(cat);
      }
      if (performance.now() < lockedUntil.current) return;
      const current = categories.find((c) => inBand.has(c));
      if (current) {
        latest.current(current);
        return;
      }
      // Above the first section (the shelf, the picks): nothing is "current" but the whole menu.
      const first = document.getElementById(sectionId(categories[0]));
      if (first && first.getBoundingClientRect().top > barHeight) latest.current(ALL);
    }, { rootMargin: `-${barHeight}px 0px -55% 0px`, threshold: 0 });

    categories.forEach((c) => {
      const el = document.getElementById(sectionId(c));
      if (el) io.observe(el);
    });
    return () => io.disconnect();
    // `list` stands for the categories array: a new array with the same names must not rebuild the observer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, enabled, stickyRef]);

  const jump = useCallback((cat: string) => {
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const bar = stickyRef.current?.offsetHeight ?? 150;
    const target = cat === ALL ? document.getElementById('menu-dishes') : document.getElementById(sectionId(cat));
    latest.current(cat);
    if (!target) return;
    const y = Math.max(0, target.getBoundingClientRect().top + window.scrollY - (cat === ALL ? 0 : bar + 6));

    // The tapped chip owns the highlight until the page has stopped moving (or the longest glide is over), so a long jump
    // never lights up every category it passes.
    const started = performance.now();
    let idle: ReturnType<typeof setTimeout>;
    const release = () => {
      window.removeEventListener('scroll', onScroll);
      lockedUntil.current = 0;
    };
    const onScroll = () => {
      clearTimeout(idle);
      if (Math.abs(window.scrollY - y) < 2 || performance.now() - started > JUMP_MAX_MS) return release();
      idle = setTimeout(release, JUMP_IDLE_MS);
    };
    lockedUntil.current = Number.POSITIVE_INFINITY;
    window.addEventListener('scroll', onScroll, { passive: true });
    idle = setTimeout(release, JUMP_IDLE_MS * 3);
    window.scrollTo({ top: y, behavior: calm ? 'auto' : 'smooth' });
  }, [stickyRef]);

  return { jump };
}
