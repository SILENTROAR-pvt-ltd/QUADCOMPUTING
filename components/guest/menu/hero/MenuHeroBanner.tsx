'use client';

import React, { useEffect, useState } from 'react';
import s from '@/components/guest/luxe/luxe-guest.module.css';

const SHOW_MS = 5600;

/**
 * The menu's banner: the venue's own dish photos as a slow film, each settling from a slight zoom and dissolving into
 * the next, under a forest veil so the words read. A venue without photos gets the forest and a soft gold light alone.
 * Only the first photo loads with the page; the rest join once it has settled. With reduced motion the first stands still.
 */
export function MenuHeroBanner({ photos, children }: { photos: string[]; children: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const [all, setAll] = useState(false);
  const [calm, setCalm] = useState(false);
  const shown = all ? photos : photos.slice(0, 1);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setCalm(true); return; }
    const t = setTimeout(() => setAll(true), 2400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (calm || shown.length < 2) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % shown.length), SHOW_MS);
    return () => clearTimeout(t);
  }, [active, calm, shown.length]);

  return (
    <div className="relative isolate overflow-hidden rounded-b-[30px] bg-[#0f2a1e] shadow-[0_30px_60px_-40px_rgba(15,42,30,0.9)]">
      {shown.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- the venue's own dish photo, already loaded for the menu below
        <img key={src} src={src} alt="" decoding="async" fetchPriority={i === 0 ? 'high' : 'low'}
          className={`absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-[1400ms] ${i === active ? `opacity-100 ${calm ? '' : s.kenburns}` : 'opacity-0'}`} />
      ))}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,22,15,0.62)_0%,rgba(8,22,15,0.42)_30%,rgba(8,22,15,0.8)_55%,rgba(8,22,15,0.95)_100%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_80%_8%,rgba(217,193,147,0.22),transparent_70%)]" />
      {children}
      {shown.length > 1 && !calm && (
        <div aria-hidden className="absolute inset-x-8 bottom-4 flex gap-1.5">
          {shown.map((src, i) => (
            <span key={src} className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/20">
              {i === active && <span key={`bar-${active}`} className={`${s.fill} block h-full bg-[#d9c193]`} style={{ ['--len' as string]: `${SHOW_MS}ms` } as React.CSSProperties} />}
              {i < active && <span className="block h-full bg-[#d9c193]/60" />}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
