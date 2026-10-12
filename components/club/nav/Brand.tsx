import React from 'react';
import Link from 'next/link';
import { CLUB_DISPLAY } from '../fonts';

/** The Vibers Club wordmark: a forest seal with an italic V, then the name in the editorial serif. */
export function Brand({ href = '/club', tone = 'ink' }: { href?: string; tone?: 'ink' | 'light' }) {
  const light = tone === 'light';
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17301f]/50">
      <span aria-hidden="true" className={`grid h-9 w-9 place-items-center rounded-full ${light ? 'bg-white text-[#17301f]' : 'bg-[#17301f] text-[#c8da4a]'}`}>
        <span className={`${CLUB_DISPLAY} text-lg italic leading-none`}>V</span>
      </span>
      <span className={`${CLUB_DISPLAY} text-[22px] font-semibold leading-none tracking-tight ${light ? 'text-white' : 'text-[#14261b]'}`}>
        Vibers <span className={`italic font-medium ${light ? 'text-[#e2ee9a]' : 'text-[#3c6b2b]'}`}>Club</span>
      </span>
    </Link>
  );
}
