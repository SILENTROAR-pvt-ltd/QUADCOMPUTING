'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { postmarkDate, postmarkName } from './postcard-look';

// The house serif of the guest app (var(--font-luxe), set on the page), with Playfair standing in until it loads.
export const POSTCARD_SERIF = { fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" } as const;

/** The postmark over the corner of the photo: wavy cancelling lines, and a ring with the venue and the day. */
export function Postmark({ venue, dateIso, id }: { venue: string; dateIso: string; id: string }) {
  const name = postmarkName(venue);
  const day = postmarkDate(dateIso);
  const path = `pm-${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'x'}`;
  return (
    <svg viewBox="0 0 130 70" className="pointer-events-none absolute right-1.5 top-1.5 h-[34%] w-[56%]" aria-hidden="true">
      <g opacity="0.92">
        {[22, 31, 40].map((y) => <path key={y} d={`M 0 ${y} q 7 -5 14 0 t 14 0 t 14 0 t 14 0`} fill="none" stroke="#ffffff" strokeWidth="1.6" strokeOpacity="0.9" />)}
        <circle cx="96" cy="35" r="26" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="44 3 31 2 52 3 29 2" />
        <circle cx="96" cy="35" r="21" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" strokeDasharray="38 2 24 3 41 2" />
        <path id={path} d="M 77 35 A 19 19 0 0 1 115 35" fill="none" />
        <text fontSize="5.6" fontWeight="800" letterSpacing="0.7" fill="#ffffff" textAnchor="middle"><textPath href={`#${path}`} startOffset="50%">{name}</textPath></text>
        <text x="96" y="39" fontSize="9.5" fontWeight="800" fill="#ffffff" textAnchor="middle">{day}</text>
        <text x="96" y="49" fontSize="5" fontWeight="800" letterSpacing="1.2" fill="#ffffff" textAnchor="middle">VIBERS</text>
      </g>
    </svg>
  );
}

interface MemoryPostcardProps {
  /** The picture: an <img>, or a place to add one. Fills a 4:3 frame. */
  photo: React.ReactNode;
  venue: string;
  dateIso: string;
  /** The words written on the card. */
  caption: React.ReactNode;
  /** Who it is from, e.g. "Reshav · Table T-01". */
  signature: string;
  tilt?: number;
  id: string;
  children?: React.ReactNode;
  className?: string;
  /** Double-tapping the photo likes the postcard. */
  onDoubleTap?: () => void;
}

/**
 * A memory as a postcard: a cream card on the wall with a slight tilt, the photo with an ink postmark over its corner, the
 * words on ruled lines in an italic hand, a small stamp, and who it is from. The same card is used to write one and to read one.
 */
export function MemoryPostcard({ photo, venue, dateIso, caption, signature, tilt = 0, id, children, className = '', onDoubleTap }: MemoryPostcardProps) {
  const [burst, setBurst] = useState(0);
  const tap = () => { if (!onDoubleTap) return; onDoubleTap(); setBurst((n) => n + 1); };
  return (
    <figure
      className={`relative rounded-[12px] bg-[#fffdf8] p-3 shadow-[0_14px_26px_-20px_rgba(40,30,10,0.55)] ring-1 ring-black/[0.06] ${className}`}
      style={{ transform: tilt ? `rotate(${tilt}deg)` : undefined }}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] bg-zinc-200" onDoubleClick={onDoubleTap ? tap : undefined}>
        {photo}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/30 to-transparent" />
        <Postmark venue={venue} dateIso={dateIso} id={id} />
        {burst > 0 && (
          <span key={burst} aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <Heart className="h-20 w-20 animate-[lp-burst_0.9s_ease-out_forwards] fill-white text-white drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]" />
          </span>
        )}
      </div>

      <figcaption className="mt-3.5 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div
            className="min-h-[84px] whitespace-pre-line break-words text-[17px] italic leading-[28px] text-[#2b2a33]"
            style={{ ...POSTCARD_SERIF, backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(70,55,30,0.12) 27px, rgba(70,55,30,0.12) 28px)' }}
          >
            {caption}
          </div>
          <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b7b5f]">{signature}</p>
        </div>
        <span aria-hidden className="mt-1 grid h-[54px] w-[44px] shrink-0 -rotate-3 place-items-center border-2 border-dashed border-[#cfc3a6] bg-[#fbf6e8] text-center">
          <span>
            <span className="block text-[15px] italic leading-none text-[#8b7b5f]" style={POSTCARD_SERIF}>{(venue || 'V').trim().slice(0, 1).toUpperCase()}</span>
            <span className="mt-0.5 block text-[6px] font-bold uppercase tracking-[0.18em] text-[#a89a7c]">Vibers</span>
          </span>
        </span>
      </figcaption>

      {children}
    </figure>
  );
}

export default MemoryPostcard;
