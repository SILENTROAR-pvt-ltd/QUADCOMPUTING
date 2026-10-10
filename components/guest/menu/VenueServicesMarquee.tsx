'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export interface VenueService {
  id: string | number;
  title: string;
  tag?: string;
  description?: string;
  price?: number;
  image_url?: string;
}

interface VenueServicesMarqueeProps {
  services?: any[];
  onSelectService?: (service: VenueService) => void;
}

const DEFAULT_FALLBACK_SERVICES: VenueService[] = [];

function normalizeServiceItem(item: any): VenueService {
  return {
    id: item.id || `srv-${Math.random()}`,
    title: item.title || item.name || 'Venue Experience',
    tag: item.tag || item.category || (item.item_type === 'room' ? 'Accommodations' : 'Services'),
    description: item.description || 'Tap to explore details and reserve instantly.',
    price: item.price ? Number(item.price) : undefined,
    image_url: item.image_url || item.imageUrl || undefined,
  };
}

export function VenueServicesMarquee({ services: propServices, onSelectService }: VenueServicesMarqueeProps) {
  const [services, setServices] = useState<VenueService[]>(() => {
    if (propServices && propServices.length > 0) {
      return propServices.map(normalizeServiceItem);
    }
    return [];
  });
  const [loading, setLoading] = useState(!propServices || propServices.length === 0);

  useEffect(() => {
    if (propServices && propServices.length > 0) {
      setServices(propServices.map(normalizeServiceItem));
      setLoading(false);
      return;
    }

    async function fetchHostServices() {
      try {
        const supabase = createClient();
        // 1. Try querying catalog_items for accommodations and hospitality services
        const { data: catData, error: catError } = await supabase
          .from('catalog_items')
          .select('*')
          .or('category.ilike.%accommodation%,category.ilike.%service%,category.ilike.%room%,item_type.eq.room,item_type.eq.service')
          .eq('is_available', true)
          .limit(8);

        if (!catError && catData && catData.length > 0) {
          setServices(catData.map(normalizeServiceItem));
          return;
        }

        // Fallback to curated premium experiences. (Previously also queried a
        // `venue_services` table that doesn't exist in this schema — removed;
        // it always failed and fell through to this same fallback anyway.)
        setServices([]);
      } catch (err) {
        console.error('Error fetching venue services:', err);
        setServices([]);
      } finally {
        setLoading(false);
      }
    }

    fetchHostServices();
  }, [propServices]);

  const displayServices = services;

  if (displayServices.length === 0) {
    return null;
  }

  return (
    <div className="w-full my-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-neutral-500">
            Unlocked Venue Experiences & Services
          </h3>
        </div>
        <span className="text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          VIP Access Active
        </span>
      </div>

      {/* Marquee Wrapper with Hover Pause & Apple Glass Styling */}
      <div className="relative w-full overflow-hidden group py-1">
        {/* Gradient Fade Masks on Edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#faf9f6] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#faf9f6] to-transparent z-10 pointer-events-none" />

        <div className="flex gap-4 animate-marquee group-hover:[animation-play-state:paused] w-max">
          {[...displayServices, ...displayServices].map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              onClick={() => onSelectService?.(item)}
              className="flex items-center gap-3.5 p-3 rounded-2xl backdrop-blur-xl bg-white/90 border border-neutral-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-xl hover:border-neutral-300 transition-all duration-300 cursor-pointer min-w-[300px] sm:min-w-[340px]"
            >
              {/* Thumbnail Image from Supabase */}
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm border border-neutral-100"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider truncate">
                    {item.tag || 'Exclusive Stay'}
                  </span>
                  {item.price ? (
                    <span className="text-xs font-bold text-neutral-900">
                      ₹{item.price}
                    </span>
                  ) : null}
                </div>
                <h4 className="text-sm font-semibold text-neutral-900 truncate">
                  {item.title}
                </h4>
                <p className="text-xs text-neutral-500 truncate">
                  {item.description || 'Tap to explore details and book instantly.'}
                </p>
              </div>

              <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
