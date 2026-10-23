'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { MenuItem } from './types';
import { LuxeReveal } from '@/components/guest/luxe/LuxeReveal';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import s from '@/components/guest/luxe/luxe-guest.module.css';

interface BeyondDiningSectionProps {
  services: MenuItem[];
  onSelectService: (service: MenuItem) => void;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/**
 * What the venue offers beyond the table, at the foot of the menu, set like the home page's "Venues with soul" cards: a
 * tall photograph drifting in slow motion that melts into ivory, a numeral, the name in italic serif and a line about
 * it. A row to swipe; a tap opens the service to request it.
 */
export const BeyondDiningSection: React.FC<BeyondDiningSectionProps> = ({ services, onSelectService }) => {
  if (!services || services.length === 0) return null;

  return (
    <section id="services-section" aria-label="Beyond dining" className="mt-12 border-t border-[#e8dfcc] pb-8 pt-10">
      <div className="mb-5 px-0.5">
        <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f] before:h-px before:w-6 before:bg-[#b08d57]">Beyond dining</p>
        <h2 className="mt-2 text-[2rem] font-light leading-[1.05] text-[#10231a] sm:text-[2.4rem]" style={LUXE_SERIF}>Explore venue <em className="font-normal text-[#8a6d3f]">services</em></h2>
        <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-[#10231a]/60">Tap any experience you would like, and our team will gladly arrange it.</p>
      </div>
      <LuxeReveal>
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
          {services.map((service, i) => (
            <li key={service.id} className="w-[76%] max-w-[300px] shrink-0 snap-start">
              <button type="button" onClick={() => onSelectService(service)} aria-label={`${service.name}, request it`}
                className="group block h-full w-full cursor-pointer overflow-hidden rounded-[20px] bg-[#fbf9f4] text-left shadow-[0_30px_70px_-40px_rgba(16,35,26,0.55)] ring-1 ring-[#10231a]/[0.06] transition-transform duration-700 hover:-translate-y-1.5 active:scale-[0.99]">
                <span className="relative block aspect-[4/5] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#1d4632,#0f2a1e)]">
                  {service.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- the venue-uploaded photo; images.unoptimized is set, so next/image would not resize it either
                    <img src={service.image_url} alt="" loading="lazy" decoding="async" className={`${s.slowmo} absolute inset-0 h-full w-full object-cover`} style={{ animationDelay: `-${(i * 3.7) % 16}s` }} />
                  ) : (
                    <Sparkles aria-hidden className="absolute left-1/2 top-[40%] h-8 w-8 -translate-x-1/2 text-[#d9c193]/70" />
                  )}
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(180deg,transparent,#fbf9f4_92%)]" />
                </span>
                <span className="relative -mt-10 block px-6 pb-7 text-center">
                  <span className="block text-[13px] italic text-[#b08d57]" style={LUXE_SERIF}>{ROMAN[i] ?? i + 1}</span>
                  <span className="mt-1 line-clamp-2 block text-[1.55rem] italic leading-tight text-[#10231a]" style={LUXE_SERIF}>{service.name}</span>
                  <span className="mx-auto mt-2 line-clamp-2 block max-w-[15rem] text-[13px] leading-relaxed text-[#10231a]/60">
                    {service.description || 'Arranged by the house, whenever you would like it.'}
                  </span>
                  <span className="mt-3 inline-block text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a6d3f]">
                    {service.price ? `₹${Number(service.price).toLocaleString('en-IN')}` : 'On request'} · Request
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </LuxeReveal>
    </section>
  );
};
