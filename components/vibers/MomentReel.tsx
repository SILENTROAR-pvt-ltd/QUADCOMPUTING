'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MOMENT_CLIPS } from './vibers-media';

const FADE_S = 0.7;

/**
 * A slim phone-shaped frame of short moments that dissolve into one another and loop. Nothing loads until the frame is
 * near the screen; each clip loads only when the one before it starts; it pauses off screen or in a hidden tab. For
 * reduced motion or data saver, the first still stays.
 */
export function MomentReel() {
  const box = useRef<HTMLDivElement>(null);
  const refs = useRef<Array<HTMLVideoElement | null>>([]);
  const [near, setNear] = useState(false);
  const [still, setStill] = useState(false);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set());
  const visible = useRef(false);
  const switching = useRef(false);

  useEffect(() => {
    const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    if (saveData || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setStill(true); return; }
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      if (e.isIntersecting) { setNear(true); setLoaded((l) => (l.size ? l : new Set([0]))); }
      const v = refs.current[active];
      if (v) { if (e.isIntersecting && !document.hidden) void v.play().catch(() => {}); else v.pause(); }
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    const onVis = () => { const v = refs.current[active]; if (!v) return; if (visible.current && !document.hidden) void v.play().catch(() => {}); else v.pause(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [active]);

  const go = useCallback((next: number) => {
    setLoaded((l) => new Set(l).add(next).add((next + 1) % MOMENT_CLIPS.length));
    setActive(next);
    const v = refs.current[next];
    if (v && visible.current) { v.currentTime = 0; void v.play().catch(() => {}); }
  }, []);

  const onTime = (k: number) => {
    const v = refs.current[k];
    if (!v || k !== active || switching.current || !v.duration || v.currentTime < v.duration - FADE_S) return;
    switching.current = true;
    go((k + 1) % MOMENT_CLIPS.length);
    setTimeout(() => { switching.current = false; }, FADE_S * 1000);
  };

  return (
    <figure className="overflow-hidden rounded-[24px] border-[6px] border-[#f5f1e8] bg-[#0f2a1e] shadow-[0_40px_80px_-30px_rgba(16,35,26,0.55)]">
      <div ref={box} aria-hidden="true" className="relative aspect-[9/16] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- the first moment's still, shown before any video loads */}
        <img src={MOMENT_CLIPS[0].poster} alt="" loading="lazy" decoding="async" width={540} height={960} className="absolute inset-0 h-full w-full object-cover" />
        {near && !still && MOMENT_CLIPS.map((c, k) => (
          <video key={c.id} ref={(el) => { refs.current[k] = el; }} muted playsInline autoPlay={k === 0} preload={loaded.has(k) ? 'auto' : 'none'}
            poster={c.poster} src={loaded.has(k) ? c.src : undefined} width={540} height={960}
            onPlaying={() => setLoaded((l) => (l.has((k + 1) % MOMENT_CLIPS.length) ? l : new Set(l).add((k + 1) % MOMENT_CLIPS.length)))}
            onTimeUpdate={() => onTime(k)} onEnded={() => { if (k === active) go((k + 1) % MOMENT_CLIPS.length); }}
            className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
            style={{ opacity: k === active ? 1 : 0, transitionDuration: `${FADE_S}s` }} />
        ))}
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1">
          {MOMENT_CLIPS.map((c, k) => <span key={c.id} className={`h-1 rounded-full bg-white/80 transition-all duration-500 ${k === active ? 'w-4' : 'w-1 opacity-50'}`} />)}
        </div>
      </div>
    </figure>
  );
}
