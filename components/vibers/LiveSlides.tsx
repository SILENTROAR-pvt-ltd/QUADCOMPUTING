'use client';

import React, { useEffect, useState } from 'react';
import { unsplash } from './mood-photos';
import s from './vibers.module.css';

const ORIGINS = ['30% 40%', '70% 30%', '50% 70%', '20% 60%'];

/**
 * Photos that feel alive, as on Vibers Club: each drifts slowly (a Ken Burns move) and the next fades in every few
 * seconds. With reduced motion the first photo simply stays. Decorative: the text beside it carries the meaning.
 */
export function LiveSlides({ ids, interval = 6000, className = '' }: { ids: readonly string[]; interval?: number; className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (ids.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIndex((n) => (n + 1) % ids.length), interval);
    return () => clearInterval(t);
  }, [ids.length, interval]);

  return (
    <div aria-hidden="true" className={`relative isolate overflow-hidden bg-[#dfe7d5] ${className}`}>
      {ids.map((id, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={id} src={unsplash(id)} alt="" loading={k < 1 ? 'eager' : 'lazy'} decoding="async" draggable={false}
          className={`${s.kenburns} absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ease-out ${k === index ? 'opacity-100' : 'opacity-0'}`}
          style={{ ['--origin' as string]: ORIGINS[k % ORIGINS.length], animationDelay: `${-k * 3}s` } as React.CSSProperties} />
      ))}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-2 py-1.5 backdrop-blur">
        {ids.map((id, k) => <span key={id} className={`h-1.5 rounded-full bg-white transition-all ${k === index ? 'w-5' : 'w-1.5 opacity-60'}`} />)}
      </div>
    </div>
  );
}
