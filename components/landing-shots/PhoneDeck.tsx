'use client';

import React, { useEffect, useRef } from 'react';
import { VIDEOS, type VideoId } from '@/lib/landing/videos';
import { IPhoneFrame } from './IPhoneFrame';

interface Props {
  /** The recordings this phone can show; the parent picks one with `active`. */
  ids: VideoId[];
  active: VideoId;
  /** Play while true (on screen, motion allowed); otherwise the poster stands still. */
  live: boolean;
  url?: string;
  className?: string;
}

/**
 * One iPhone whose screen follows a story told around it (PhoneReel steps itself; this one is told what to show). The
 * chosen recording fades in from its first frame and loops; the others wait paused, and only the chosen one is fetched.
 */
export function PhoneDeck({ ids, active, live, url = 'vibersconnect.com', className = 'w-[260px]' }: Props) {
  const videos = useRef<Partial<Record<VideoId, HTMLVideoElement | null>>>({});

  useEffect(() => {
    for (const id of ids) {
      const v = videos.current[id];
      if (!v) continue;
      if (id === active && live) {
        if (v.preload !== 'auto') v.preload = 'auto';
        void v.play().catch(() => undefined);
      } else {
        v.pause();
        if (id !== active) v.currentTime = 0;
      }
    }
  }, [ids, active, live]);

  return (
    <figure className={className}>
      <IPhoneFrame url={url}>
        {ids.map((id) => {
          const v = VIDEOS[id];
          const on = id === active;
          return (
            <video key={id} ref={(el) => { videos.current[id] = el; }} poster={v.poster} muted loop playsInline preload="none"
              aria-label={v.alt} aria-hidden={!on} width={v.width} height={v.height}
              className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ${on ? 'opacity-100' : 'opacity-0'}`}>
              <source src={v.src} type="video/mp4" />
            </video>
          );
        })}
      </IPhoneFrame>
    </figure>
  );
}
