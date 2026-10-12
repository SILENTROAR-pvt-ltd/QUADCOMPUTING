'use client';

import React, { useEffect, useState } from 'react';
import { photoUrl, type Photo } from './photos';
import styles from './club.module.css';

interface SlidesProps {
  srcs: string[];
  alts?: string[];
  /** Milliseconds each image stays before the next fades in. */
  interval?: number;
  className?: string;
  /** Pagination dots, like the dots on a hotel gallery. */
  dots?: boolean;
  /** Anything drawn over the image (captions, buttons); receives the index on screen. */
  children?: (index: number) => React.ReactNode;
}

const ORIGINS = ['30% 40%', '70% 30%', '50% 70%', '20% 60%'];

/**
 * Images that feel alive: each drifts slowly (a Ken Burns move) and the next fades in every few
 * seconds. With reduced motion the first image simply stays.
 */
export function LiveSlides({ srcs, alts = [], interval = 6000, className = '', dots = false, children }: SlidesProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (srcs.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIndex((n) => (n + 1) % srcs.length), interval);
    return () => clearInterval(t);
  }, [srcs.length, interval]);

  return (
    <div className={`relative isolate overflow-hidden bg-[#dfe7d5] ${className}`}>
      {srcs.map((src, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt={k === index ? alts[k] ?? '' : ''} aria-hidden={k !== index}
          loading={k < 2 ? 'eager' : 'lazy'} decoding="async" draggable={false}
          className={`${styles.kenburns} absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ease-out ${k === index ? 'opacity-100' : 'opacity-0'}`}
          style={{ ['--origin' as any]: ORIGINS[k % ORIGINS.length], animationDelay: `${-k * 3}s` }} />
      ))}
      {children?.(index)}
      {dots && srcs.length > 1 && (
        <div aria-hidden="true" className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-2 py-1.5 backdrop-blur">
          {srcs.map((src, k) => <span key={src} className={`h-1.5 rounded-full bg-white transition-all ${k === index ? 'w-5' : 'w-1.5 opacity-60'}`} />)}
        </div>
      )}
    </div>
  );
}

/** The travel photo library as a live slideshow; children receive the photo on screen. */
export function LivePhotos({ photos, width = 1400, children, ...rest }: Omit<SlidesProps, 'srcs' | 'alts' | 'children'> & { photos: Photo[]; width?: number; children?: (photo: Photo, index: number) => React.ReactNode }) {
  return (
    <LiveSlides {...rest} srcs={photos.map((p) => photoUrl(p.id, width))} alts={photos.map((p) => (p.place ? `${p.place}, ${p.country}` : ''))}>
      {children ? (i) => children(photos[i] ?? photos[0], i) : undefined}
    </LiveSlides>
  );
}

/** A single photo with the same slow drift (for banners and cards). */
export function DriftPhoto({ src, alt = '', className = '' }: { src: string; alt?: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#dfe7d5] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" draggable={false} className={`${styles.kenburns} absolute inset-0 h-full w-full object-cover`} />
    </div>
  );
}
