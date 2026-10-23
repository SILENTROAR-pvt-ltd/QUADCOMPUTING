'use client';

import React, { useEffect, useRef, useState } from 'react';
import { VIDEOS, type VideoId } from '@/lib/landing/videos';
import { IPhoneFrame } from './IPhoneFrame';

interface Props {
  ids: VideoId[];
  /** A short line under the phone for each recording, changing with it. */
  captions?: string[];
  /** The address in Safari's bar. */
  url?: string;
  className?: string;
  /** Wait this long after it comes into view before playing (to stagger phones shown side by side). */
  startDelayMs?: number;
}

/**
 * Several recordings on one iPhone, one after another: when one ends, the next fades in from its first frame, and after
 * the last the first comes back. Only the one showing plays, and only while the phone is on screen; the next is fetched
 * while the current one plays. With reduced motion the first recording's poster stands still.
 */
export function PhoneReel({ ids, captions, url = 'vibersconnect.com', className = 'w-[260px]', startDelayMs = 0 }: Props) {
  const box = useRef<HTMLElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (e.isIntersecting) timer = setTimeout(() => setLive(true), startDelayMs); else setLive(false);
    }, { rootMargin: '120px 0px', threshold: 0.15 });
    io.observe(el);
    return () => { io.disconnect(); if (timer) clearTimeout(timer); };
  }, [startDelayMs]);

  // Play the one showing, pause the rest, and start fetching the next.
  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (!v) return;
      if (i === active && live) { if (v.preload !== 'auto') v.preload = 'auto'; void v.play().catch(() => undefined); } else v.pause();
    });
    const next = videos.current[(active + 1) % ids.length];
    if (live && next && next.preload !== 'auto') next.preload = 'auto';
  }, [active, live, ids.length]);

  const advance = () => {
    const next = (active + 1) % ids.length;
    const v = videos.current[next];
    if (v) v.currentTime = 0;
    if (next === active) void v?.play().catch(() => undefined); else setActive(next);
  };

  return (
    <figure ref={box} className={className}>
      <IPhoneFrame url={url}>
        {ids.map((id, i) => {
          const v = VIDEOS[id];
          return (
            <video key={id} ref={(el) => { videos.current[i] = el; }} poster={v.poster} muted playsInline preload="none"
              aria-label={v.alt} aria-hidden={i !== active} width={v.width} height={v.height} onEnded={i === active ? advance : undefined}
              className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ${i === active ? 'opacity-100' : 'opacity-0'}`}>
              <source src={v.src} type="video/mp4" />
            </video>
          );
        })}
      </IPhoneFrame>
      {captions && (
        <figcaption className="mt-5 grid text-center text-[10px] font-semibold uppercase tracking-[0.26em]">
          {captions.map((c, i) => (
            <span key={c} aria-hidden={i !== active} className={`[grid-area:1/1] transition-opacity duration-700 ${i === active ? 'opacity-100' : 'opacity-0'}`}>{c}</span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
