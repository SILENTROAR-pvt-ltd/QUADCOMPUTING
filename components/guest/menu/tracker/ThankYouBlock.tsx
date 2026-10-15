'use client';

import React from 'react';

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;
const THANK_YOU = '/media/stickers/thank-you-v1.webp';

interface ThankYouBlockProps {
  /** The small line above the heading, for example "Table T-01 · Bill settled". */
  eyebrow: string;
  title: string;
  body: string;
  /** A tighter version for inside a sheet or card. */
  compact?: boolean;
}

/**
 * The venue's animated thank-you sticker with its heading: shown when a bill is settled, and the moment a guest tells us they
 * have paid. One piece, so the two never drift apart.
 */
export function ThankYouBlock({ eyebrow, title, body, compact = false }: ThankYouBlockProps) {
  return (
    <div className={`relative text-center ${compact ? 'px-1 pb-1 pt-1' : 'px-6 pb-6 pt-7'}`}>
      {!compact && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(120,100,60,0.08),transparent_75%)]" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- a 105 KB animated sticker from public/media; images.unoptimized is set, and next/image would flatten the animation */}
      <img
        src={THANK_YOU}
        alt="Thank you"
        width={132}
        height={122}
        draggable={false}
        className={`relative mx-auto select-none object-contain ${compact ? 'h-[104px] w-[112px]' : 'h-[122px] w-[132px]'}`}
      />
      <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-400">{eyebrow}</p>
      <h3 className={`mx-auto mt-2 max-w-sm leading-[1.15] text-zinc-950 [text-wrap:balance] ${compact ? 'text-[22px]' : 'text-[26px]'}`} style={SERIF}>
        {title}
      </h3>
      <p className={`mx-auto max-w-sm leading-relaxed text-zinc-500 [text-wrap:balance] ${compact ? 'mt-2 text-[12.5px]' : 'mt-2.5 text-[13px]'}`}>
        {body}
      </p>
    </div>
  );
}

export default ThankYouBlock;
