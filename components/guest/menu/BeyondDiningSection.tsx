'use client';

import React from 'react';
import { MenuItem } from './types';
import { ArrowRight } from 'lucide-react';
import { SERVICE_SERIF } from './ServiceTile';

interface BeyondDiningSectionProps {
  services: MenuItem[];
  onSelectService: (service: MenuItem) => void;
}

/** What the venue offers beyond the table, at the foot of the menu, in the same tiles as "Experiences & services" above. */
export const BeyondDiningSection: React.FC<BeyondDiningSectionProps> = ({ services, onSelectService }) => {
  if (!services || services.length === 0) return null;

  return (
    <section id="services-section" aria-label="Beyond dining" className="mt-12 border-t border-zinc-200/80 pb-8 pt-10">
      <div className="mb-3 px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-400">Beyond dining</p>
        <h2 className="mt-1 text-[21px] leading-tight text-zinc-950" style={SERVICE_SERIF}>Explore venue services</h2>
        <p className="mt-1.5 text-[12px] leading-snug text-zinc-500">Tap any to request it. Our team will add it to your bill.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelectService(service)}
            className="group flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(0,0,0,0.35)] active:scale-[0.98] cursor-pointer"
          >
            <span className="relative mb-2.5 block aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
              {service.image_url && (
                // eslint-disable-next-line @next/next/no-img-element -- the venue-uploaded photo; images.unoptimized is set, so next/image would not resize it either
                <img src={service.image_url} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              )}
              <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-zinc-950 text-white shadow-md transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </span>
            <span className="px-0.5">
              <span className="block truncate text-[9.5px] font-medium uppercase tracking-[0.18em] text-zinc-400">{service.category || 'Service'}</span>
              <span className="mt-0.5 line-clamp-2 min-h-[2.2rem] text-[14px] leading-tight text-zinc-950" style={SERVICE_SERIF}>{service.name}</span>
              <span className="mt-1 block text-[13px] font-semibold text-zinc-900">{service.price ? `₹${service.price}` : 'On request'}</span>
            </span>
          </button>
        ))}
      </div>    </section>
  );
};
