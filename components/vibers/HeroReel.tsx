'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HERO_CLIPS } from './vibers-media';
import s from './luxe.module.css';

const FADE_S = 1.1;

/**
 * The opening film: short clips that dissolve into one another (yacht, people, heights, nights) and loop. The first
 * clip's still is painted at once; each clip loads only when the one before it starts, the phone gets its own portrait
 * cut, and the film pauses when it leaves the screen or the tab is hidden. For reduced motion or data saver, the still
 * stays. Decorative: the words over it carry the meaning.
 */
export function HeroReel() {
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  const [phone, setPhone] = useState<boolean | null>(null);
  const [still, setStill] = useState(false);
  const [playing, setPlaying] = useState(false);
  const refs = useRef<Array<HTMLVideoElement | null>>([]);
  const box = useRef<HTMLDivElement>(null);
  const switching = useRef(false);

  useEffect(() => {
    const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    setStill(saveData || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setPhone(window.matchMedia('(max-width: 767px), (orientation: portrait) and (max-width: 1024px)').matches);
  }, []);

  const go = useCallback((next: number) => {
    const v = refs.current[next];
    setLoaded((l) => new Set(l).add(next).add((next + 1) % HERO_CLIPS.length));
    setActive(next);
    if (v) { v.currentTime = 0; void v.play().catch(() => {}); }
  }, []);

  // Near the end of the running clip, the next one starts underneath and the two dissolve.
  const onTime = (k: number) => {
    const v = refs.current[k];
    if (!v || k !== active || switching.current || !v.duration) return;
    if (v.currentTime >= v.duration - FADE_S) {
      switching.current = true;
      go((k + 1) % HERO_CLIPS.length);
      setTimeout(() => { switching.current = false; }, FADE_S * 1000);
    }
  };

  // Off screen or in a hidden tab, the film rests.
  useEffect(() => {
    if (still || phone === null) return;
    const el = box.current;
    let visible = true;
    const sync = () => {
      const v = refs.current[active];
      if (!v) return;
      if (visible && !document.hidden) void v.play().catch(() => {}); else v.pause();
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.05 });
    if (el) io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, [active, still, phone]);

  const clip = HERO_CLIPS[active];
  return (
    <div ref={box} aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#0b1712]">
      <picture>
        <source media="(max-width: 767px), (orientation: portrait) and (max-width: 1024px)" srcSet={HERO_CLIPS[0].phonePoster} />
        {/* eslint-disable-next-line @next/next/no-img-element -- the film's first frame, painted before any video loads */}
        <img src={HERO_CLIPS[0].desktopPoster} alt="" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      </picture>
      {!still && phone !== null && HERO_CLIPS.map((c, k) => (
        <video key={c.id} ref={(el) => { refs.current[k] = el; }} muted playsInline autoPlay={k === 0} preload={loaded.has(k) ? 'auto' : 'none'}
          poster={phone ? c.phonePoster : c.desktopPoster} src={loaded.has(k) ? (phone ? c.phone : c.desktop) : undefined}
          onPlaying={() => { if (k === 0) setPlaying(true); setLoaded((l) => (l.has((k + 1) % HERO_CLIPS.length) ? l : new Set(l).add((k + 1) % HERO_CLIPS.length))); }} onTimeUpdate={() => onTime(k)} onEnded={() => { if (k === active) go((k + 1) % HERO_CLIPS.length); }}
          className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
          style={{ opacity: k === active && (k !== 0 || playing) ? 1 : 0, transitionDuration: `${FADE_S}s` }} />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,14,10,0.55)_0%,rgba(6,14,10,0.12)_32%,rgba(6,14,10,0.2)_62%,rgba(8,22,15,0.86)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(4,10,7,0.45)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 z-10 hidden items-end justify-between gap-6 px-8 pb-7 text-[#f5f1e8] sm:flex">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#f5f1e8]/75">
          <span className="text-[#d9c193]">{String(active + 1).padStart(2, '0')}</span> / {String(HERO_CLIPS.length).padStart(2, '0')} · {clip.caption}
        </p>
        <div className="flex w-56 gap-1.5">
          {HERO_CLIPS.map((c, k) => (
            <span key={c.id} className="h-px flex-1 overflow-hidden bg-[#f5f1e8]/25">
              {(k < active || (k === active && still)) && <span className="block h-full w-full bg-[#d9c193]" />}
              {k === active && playing && !still && <span key={`${active}-${c.id}`} className={`block h-full w-full bg-[#d9c193] ${s.fill}`} style={{ ['--len' as string]: `${c.seconds}s` } as React.CSSProperties} />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
