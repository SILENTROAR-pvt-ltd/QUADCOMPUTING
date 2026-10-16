'use client';

import { useEffect, useRef } from 'react';

/**
 * Plays a muted, looping video only while it is on screen (and loads it only then), so a page with several recordings
 * spends nothing on the ones out of sight. With reduced motion it never plays; its poster stands in.
 */
export function useInViewVideo() {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (video.preload !== 'auto') video.preload = 'auto';
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    }, { rootMargin: '120px 0px', threshold: 0.15 });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return ref;
}
