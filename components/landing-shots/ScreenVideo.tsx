'use client';

import React from 'react';
import { VIDEOS, type VideoId } from '@/lib/landing/videos';
import { useInViewVideo } from './useInViewVideo';

/** A recording that fills a browser frame's window, playing only while on screen. */
export function ScreenVideo({ id }: { id: VideoId }) {
  const v = VIDEOS[id];
  const ref = useInViewVideo();
  return (
    <video ref={ref} poster={v.poster} muted loop playsInline preload="none" aria-label={v.alt}
      width={v.width} height={v.height} className="absolute inset-0 h-full w-full object-cover object-top">
      <source src={v.src} type="video/mp4" />
    </video>
  );
}
