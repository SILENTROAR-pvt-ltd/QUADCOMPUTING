'use client';

import React, { useEffect, useRef } from 'react';
import { VIDEOS, type VideoId } from '@/lib/landing/videos';
import s from '@/components/vibers/luxe.module.css';

/** One recording filling a window, started from its first frame whenever it becomes the one showing (and while `play`). */
export function StageVideo({ id, play }: { id: VideoId; play: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const v = VIDEOS[id];
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (play) { el.preload = 'auto'; el.currentTime = 0; void el.play().catch(() => undefined); } else el.pause();
  }, [play]);
  return (
    <video ref={ref} poster={v.poster} muted loop playsInline preload="none" aria-label={v.alt} width={v.width} height={v.height}
      className={`absolute inset-0 h-full w-full object-cover object-top ${s.fadeUp}`}>
      <source src={v.src} type="video/mp4" />
    </video>
  );
}

/** A light browser window around product footage, with the screen's name in the address bar. */
export function BrowserWindow({ url, ratio, children, className = '' }: { url: string; ratio: number; children: React.ReactNode; className?: string }) {
  return (
    <figure className={`overflow-hidden rounded-[16px] border border-black/10 bg-white shadow-[0_40px_90px_-40px_rgba(12,15,13,0.55)] ${className}`}>
      <div aria-hidden="true" className="flex items-center gap-2 border-b border-black/[0.06] bg-[#f4f3ee] px-3 py-2 sm:px-4">
        <span className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" /></span>
        <span className="ml-2 min-w-0 flex-1 truncate rounded-md bg-white px-3 py-1 text-center text-[10px] text-zinc-500 sm:text-[11px]">quadcomputing.app · {url}</span>
      </div>
      <div className="relative w-full overflow-hidden bg-[#faf9f6]" style={{ aspectRatio: ratio }}>{children}</div>
    </figure>
  );
}
