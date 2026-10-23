'use client';

import React, { useState } from 'react';
import type { GalleryPhoto } from '@/lib/services/menu-info/gallery';
import { SocialMediaLightbox } from '@/components/guest/lobby/SocialMediaLightbox';
import { LuxeReveal } from '@/components/guest/luxe/LuxeReveal';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { MomentArcCard } from './MomentArcCard';

/**
 * The memory vault: moments the house itself has shared (from Menu & Catalogue), as arch-topped photographs floating in a
 * row to swipe through, like the experiences on the home page. A tap opens one full screen. Draws nothing until the host
 * has added a photo.
 */
export function MemoryVault({ gallery, venueName }: { gallery: GalleryPhoto[]; venueName: string }) {
  const [open, setOpen] = useState<GalleryPhoto | null>(null);
  if (gallery.length === 0) return null;

  return (
    <section aria-labelledby="memory-vault-title" className="border-t border-[#e8dfcc] pt-10">
      <LuxeReveal className="px-0.5">
        <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f] before:h-px before:w-6 before:bg-[#b08d57]">The memory vault</p>
        <h2 id="memory-vault-title" className="mt-2 text-[2.1rem] font-light leading-[1.04] text-[#10231a] sm:text-[2.5rem]" style={LUXE_SERIF}>
          Moments at <em className="font-normal text-[#8a6d3f]">{venueName || 'the venue'}</em>
        </h2>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#10231a]/65">A few evenings the house keeps close.</p>
      </LuxeReveal>

      {/* Room above and below for the cards' drift and their staggered heights. */}
      <LuxeReveal>
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 items-start gap-4 overflow-x-auto px-4 pb-10 pt-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
          {gallery.map((p, i) => (
            <li key={p.url} className="w-[58%] max-w-[250px] shrink-0 snap-start">
              <MomentArcCard photo={p} i={i} onOpen={() => setOpen(p)} />
            </li>
          ))}
        </ul>
      </LuxeReveal>
      <SocialMediaLightbox imageUrl={open?.url ?? null} onClose={() => setOpen(null)} altText={open?.caption || `${venueName} moment`} />
    </section>
  );
}
