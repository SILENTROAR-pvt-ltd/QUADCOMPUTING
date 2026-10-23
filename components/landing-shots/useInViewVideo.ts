'use client';

import { useEffect, useRef } from 'react';

/**
 * Plays a muted, looping video only while it is on screen (and loads it only then), so a page with several recordings
 * spends nothing on the ones out of sight. With reduced motion it never plays; its poster stands in.
 */
export function useInViewVideo(startDelayMs = 0) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Two recordings side by side start a beat apart, so their decoders do not spin up in the same frame mid-scroll.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(([entry]) => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (entry.isIntersecting) {
        const start = () => { if (video.preload !== 'auto') video.preload = 'auto'; void video.play().catch(() => undefined); };
        if (startDelayMs > 0) timer = setTimeout(start, startDelayMs); else start();
      } else {
        video.pause();
      }
    }, { rootMargin: '120px 0px', threshold: 0.15 });
    observer.observe(video);
    return () => { observer.disconnect(); if (timer) clearTimeout(timer); };
  }, [startDelayMs]);

  return ref;
}
