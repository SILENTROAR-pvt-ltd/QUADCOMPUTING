import React from 'react';
import type { GalleryPhoto } from '@/lib/services/menu-info/gallery';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import s from '@/components/guest/luxe/luxe-guest.module.css';

// Each card floats on its own beat (a negative delay starts it mid-drift) and sits at its own height, so the row reads
// as a loose constellation rather than a grid, as on the home page.
const BEATS = [
  { y: 'mt-0', fd: '6.6s', fdl: '0s' },
  { y: 'mt-10', fd: '7.9s', fdl: '-2.2s' },
  { y: 'mt-4', fd: '7.2s', fdl: '-4.1s' },
  { y: 'mt-12', fd: '8.5s', fdl: '-1.3s' },
];

/** One of the house's moments in an arch-topped frame: the photo drifting slowly, its number, and the host's line. */
export function MomentArcCard({ photo, i, onOpen }: { photo: GalleryPhoto; i: number; onOpen: () => void }) {
  const b = BEATS[i % BEATS.length];
  return (
    <div className={`${s.float} ${b.y}`} style={{ ['--fd' as string]: b.fd, ['--fdl' as string]: b.fdl } as React.CSSProperties}>
      <button type="button" onClick={onOpen} aria-label={photo.caption ? `Open photo: ${photo.caption}` : 'Open photo'}
        className="group relative isolate block w-full cursor-zoom-in overflow-hidden rounded-b-[22px] rounded-t-[999px] bg-[#0f2a1e] text-left shadow-[0_34px_60px_-38px_rgba(16,35,26,0.65)] transition-transform duration-700 hover:-translate-y-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- the venue's own photo from its memory vault */}
        <img src={photo.url} alt={photo.caption || 'A moment at the venue'} loading="lazy" decoding="async"
          className={`${s.slowmo} aspect-[5/7] w-full object-cover`} style={{ animationDelay: `-${(i * 4.3) % 16}s` }} />
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(8,22,15,0.9)_100%)]" />
        <span className="absolute left-1/2 top-[12%] -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f5f1e8]/90 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#10231a]">
          Nº {String(i + 1).padStart(2, '0')}
        </span>
        <span className="absolute inset-x-0 bottom-0 px-4 pb-5 text-center text-[#f5f1e8]">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.3em] text-[#d9c193]">The house</span>
          <span className="mt-1.5 line-clamp-3 block text-[1.3rem] italic leading-[1.08]" style={LUXE_SERIF}>{photo.caption || 'An evening worth keeping'}</span>
        </span>
      </button>
    </div>
  );
}
