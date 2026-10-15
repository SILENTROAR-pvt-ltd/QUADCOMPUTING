'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ServiceTile } from './ServiceTile';

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

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

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
    <section aria-label="Venue experiences and services" className="my-5 w-full">
      <div className="mb-3 px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8a6d2b]">At your service</p>
        <h3 className="mt-1 text-[21px] leading-tight text-zinc-950" style={SERIF}>Experiences &amp; services</h3>
      </div>

      {/* Drifts from right to left and loops. It stops under a finger or the pointer; with reduced motion it is a row to swipe. */}
      <div className="group relative overflow-hidden motion-reduce:overflow-x-auto motion-reduce:[scrollbar-width:none]">
        <div
          className="flex w-max animate-offers-rtl group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ animationDuration: `${Math.max(24, displayServices.length * 9)}s` }}
        >
          {[...displayServices, ...displayServices].map((item, i) => (
            <ServiceTile
              key={`${String(item.id)}-${i}`}
              title={item.title}
              tag={item.tag || 'Service'}
              price={item.price}
              image={item.image_url}
              onOpen={() => onSelectService?.(item)}
              className="mr-3 w-[236px] shrink-0 sm:w-[256px]"
            />
          ))}
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#faf9f6] to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#faf9f6] to-transparent" />
      </div>    </section>
  );
}