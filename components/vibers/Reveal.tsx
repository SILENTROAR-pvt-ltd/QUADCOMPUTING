'use client';

import React, { useEffect, useRef, useState } from 'react';
import s from './luxe.module.css';

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Stagger position among siblings (each step waits 110 ms more). */
  index?: number;
  as?: 'div' | 'li' | 'figure' | 'article' | 'ul';
  /** Settle a photo inside from a slight zoom instead of rising. */
  settle?: boolean;
  /**
   * Reveal the children one after another (each sets its own --i) when this container arrives. For swipe rows: a card
   * waiting off to the side is clipped by the row, so it could never be seen arriving on its own.
   */
  stagger?: boolean;
}

/**
 * Brings its content into place once it is a little way into view, and leaves it there. Without JavaScript (or for
 * reduced motion) the content simply shows: the hidden state is applied only after the observer is running.
 */
export function Reveal({ children, className = '', index = 0, as: Tag = 'div', settle = false, stagger = false }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<'idle' | 'waiting' | 'shown'>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setState('shown'); return; }
    // Already on screen when the page opens: show at once, no delay.
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92 && r.bottom > 0) { setState('shown'); return; }
    setState('waiting');
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setState('shown'); io.disconnect(); }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const motion = settle || state === 'idle' ? '' : stagger ? s.stagger : s.reveal;
  return (
    <Tag ref={ref as never} data-shown={state !== 'waiting'} className={`${motion} ${className}`} style={{ ['--i' as string]: index } as React.CSSProperties}>
      {children}
    </Tag>
  );
}
