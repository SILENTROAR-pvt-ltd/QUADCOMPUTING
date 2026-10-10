'use client';

import React from 'react';
import { MenuItem } from './types';

interface BeyondDiningSectionProps {
  services: MenuItem[];
  onSelectService: (service: MenuItem) => void;
}

const DEFAULT_VENUE_SERVICES: MenuItem[] = [];

export const BeyondDiningSection: React.FC<BeyondDiningSectionProps> = ({
  services,
  onSelectService,
}) => {
  const displayServices = services;

  if (!displayServices || displayServices.length === 0) {
    return null;
  }

  return (
    <div id="services-section" className="border-t border-zinc-200/80 pt-12 mt-12 pb-8 space-y-6">
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 font-medium block">
          BEYOND DINING
        </span>
        <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-zinc-950 tracking-tight">
          Explore Venue Services
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 font-light">
          Extras the venue offers. Tap one to request it; it&apos;s added to your bill by the staff.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {displayServices.map((service) => (
          <div
            key={service.id}
            onClick={() => onSelectService(service)}
            className="group rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 transition-all hover:bg-white hover:border-zinc-300 hover:shadow-sm cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              {service.image_url && (
                <div className="h-36 sm:h-40 w-full overflow-hidden rounded-xl bg-zinc-100">
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-zinc-200/70 text-zinc-700">
                  {service.category || 'Service'}
                </span>
                <span className="text-sm font-semibold text-zinc-900 tracking-tight font-sans">
                  ₹{service.price}
                </span>
              </div>
              <h4 className="font-editorial text-base sm:text-lg font-medium text-zinc-950 group-hover:text-black">
                {service.name}
              </h4>
              {service.description && (
                <p className="text-xs text-zinc-500 font-light line-clamp-2">
                  {service.description}
                </p>
              )}
            </div>

            <button
              type="button"
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 text-xs font-medium text-zinc-800 group-hover:border-black transition-colors cursor-pointer"
            >
              Inquire with Concierge →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
