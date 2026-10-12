import React from 'react';
import Link from 'next/link';
import { SectionTitle } from '../ui-extra';
import { shortDate } from '../api';
import { moodPhoto } from '../photos';
import type { MemberProfileData } from './types';

/** Upcoming plans this member hosts, as photo tiles (like the photo row on a travel profile). */
export function HostedPlans({ plans, self }: { plans: MemberProfileData['plans']; self: boolean }) {
  if (plans.length === 0) return null;
  return (
    <section id="plans" aria-labelledby="plans-title" className="scroll-mt-24">
      <SectionTitle id="plans-title" title={self ? 'Plans you are hosting' : 'Hosting soon'} action={<Link href="/club/events" className="text-sm font-semibold text-[#3c6b2b] hover:underline">See all ›</Link>} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {plans.map((p) => (
          <Link key={p.id} href={`/club/events/${p.id}`} className="group relative aspect-[4/5] overflow-hidden rounded-[24px] bg-[#dfe7d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17301f]/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.cover || moodPhoto(p.kind, p.id, 600)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-12 text-white">
              <span className="block truncate text-sm font-semibold">{p.title}</span>
              <span className="block truncate text-[11px] text-white/80">{shortDate(p.starts_at)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
