'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { CONTAINER } from './qc-brand';
import { DISPLAY } from '@/components/vibers/vibers-fonts';

const LINKS = [
  { id: 'live-flow', label: 'How it flows' },
  { id: 'play', label: 'Try it' },
  { id: 'grow', label: 'Grow sales' },
  { id: 'guests', label: 'For guests' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'compare', label: 'Compare' },
];

/**
 * The top bar: glass over the dark hero, paper once the reader is past it. The link for the section on screen is marked,
 * and on a phone the links open as a sheet.
 */
export function QcNav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id);
    }, { rootMargin: '-45% 0px -50% 0px' });
    LINKS.forEach((l) => { const el = document.getElementById(l.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const light = solid || open;
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${light ? 'border-b border-[#e6dfcf] bg-[#f6f3ec]/90 text-[#0c0f0d] backdrop-blur-md' : 'bg-gradient-to-b from-black/50 to-transparent text-[#f6f3ec]'}`}>
      <nav aria-label="Main" className={`${CONTAINER} flex h-16 items-center justify-between gap-4`}>
        <Link href="/quad-computing" aria-label="Quad Computing home" className="flex shrink-0 items-center gap-2.5">
          <span aria-hidden="true" className={`grid h-8 w-8 place-items-center rounded-lg text-[11px] font-semibold tracking-wider ${light ? 'bg-[#0c0f0d] text-[#f6f3ec]' : 'bg-[#f6f3ec] text-[#0c0f0d]'}`}>QC</span>
          <span className={`${DISPLAY} text-[21px] font-medium leading-none`}>Quad Computing</span>
        </Link>

        <ul className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <li key={l.id}>
              <a href={`#${l.id}`} aria-current={current === l.id ? 'true' : undefined}
                className={`relative text-[13px] transition-opacity hover:opacity-100 ${current === l.id ? 'opacity-100' : 'opacity-65'} after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-[#b08d57] after:transition-all ${current === l.id ? 'after:w-full' : 'after:w-0'}`}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link href="/auth/host" className={`hidden h-9 items-center rounded-full border px-4 text-[13px] font-semibold transition-colors sm:inline-flex ${light ? 'border-[#0c0f0d]/20 hover:border-[#0c0f0d]' : 'border-[#f6f3ec]/35 hover:border-[#f6f3ec]'}`}>Host login</Link>
          <Link href="/onboarding/host" className={`inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold transition-colors ${light ? 'bg-[#0c0f0d] text-[#f6f3ec] hover:bg-[#252a26]' : 'bg-[#f6f3ec] text-[#0c0f0d] hover:bg-white'}`}>Start free</Link>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="qc-menu" aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid h-9 w-9 place-items-center rounded-full lg:hidden">
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="qc-menu" className="border-t border-[#e6dfcf] bg-[#f6f3ec] lg:hidden">
          <ul className={`${CONTAINER} py-4`}>
            {LINKS.map((l) => (
              <li key={l.id}><a href={`#${l.id}`} onClick={() => setOpen(false)} className={`${DISPLAY} block py-2.5 text-[1.5rem]`}>{l.label}</a></li>
            ))}
            <li className="pt-3"><Link href="/auth/host" className="text-[14px] font-semibold underline underline-offset-4">Host login</Link></li>
          </ul>
        </div>
      )}
    </header>
  );
}
