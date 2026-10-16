'use client';

import React from 'react';
import { VIDEOS, type VideoId } from '@/lib/landing/videos';
import { IPhoneFrame } from './IPhoneFrame';
import { useInViewVideo } from './useInViewVideo';

interface Props {
  id: VideoId;
  /** The address in Safari's bar. */
  url?: string;
  className?: string;
}

/**
 * A recording of the product playing on an iPhone, as if someone were using it. It loads and plays only while on screen,
 * and for people who prefer reduced motion it stays on its first frame.
 */
export function LivePhone({ id, url = 'vibersconnect.com', className = 'w-[260px]' }: Props) {
  const v = VIDEOS[id];
  const ref = useInViewVideo();
  return (
    <figure className={className}>
      <IPhoneFrame url={url}>
        <video ref={ref} poster={v.poster} muted loop playsInline preload="none" aria-label={v.alt}
          width={v.width} height={v.height} className="absolute inset-0 h-full w-full object-cover object-top">
          <source src={v.src} type="video/mp4" />
        </video>
      </IPhoneFrame>
    </figure>
  );
}
