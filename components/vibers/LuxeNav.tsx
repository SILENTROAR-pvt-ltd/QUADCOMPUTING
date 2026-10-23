'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DISPLAY, SCRIPT } from './vibers-fonts';

const LINKS = [
  { href: '#vibe', label: 'The Vibe' },
  { href: '#venues', label: 'Venues' },
  { href: '#stay', label: 'Your Stay' },
  { href: '#club', label: 'Vibers Club' },
];

/**
 * Clear over the opening film, then ivory with a soft blur once the reader scrolls past it. The wordmark repeats the
 * hero's: Garamond capitals with a small gold script.
 */
export function LuxeNav() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.82);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const ink = solid ? 'text-[#10231a]' : 'text-[#f5f1e8]';
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${solid ? 'border-b border-[#10231a]/[0.08] bg-[#f5f1e8]/95 shadow-[0_8px_30px_-24px_rgba(16,35,26,0.35)]' : 'bg-transparent'}`}>
      <nav aria-label="Main" className="mx-auto flex h-[72px] w-full max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" aria-label="Vibers Connect home" className={`flex items-baseline gap-1.5 ${ink} transition-colors`}>
          <span className={`${DISPLAY} text-[22px] font-semibold tracking-[0.22em]`}>VIBERS</span>
          <span className={`${SCRIPT} text-[24px] leading-none ${solid ? 'text-[#8a6d3f]' : 'text-[#d9c193]'}`}>Connect</span>
        </Link>
        <ul className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={`text-[10.5px] font-semibold uppercase tracking-[0.2em] transition-colors ${solid ? 'text-[#10231a]/65 hover:text-[#10231a]' : 'text-[#f5f1e8]/75 hover:text-[#f5f1e8]'}`}>{l.label}</a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4">
          <Link href="/quad-computing" className={`hidden text-[10.5px] font-semibold uppercase tracking-[0.2em] md:inline ${solid ? 'text-[#10231a]/65 hover:text-[#10231a]' : 'text-[#f5f1e8]/75 hover:text-[#f5f1e8]'}`}>For venues</Link>
          <Link href="/join" className={`inline-flex h-10 items-center rounded-full px-5 text-[12px] font-semibold tracking-[0.06em] transition-all duration-300 ${solid ? 'bg-[#0f2a1e] text-[#f5f1e8] hover:bg-[#173a2a]' : 'border border-[#f5f1e8]/50 text-[#f5f1e8] hover:border-[#f5f1e8] hover:bg-white/5'}`}>
            Join the Club
          </Link>
        </div>
      </nav>
    </header>
  );
}
