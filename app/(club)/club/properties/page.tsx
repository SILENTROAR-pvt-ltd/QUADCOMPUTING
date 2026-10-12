'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, Plus } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { useClub } from '@/components/club/club-context';
import { Empty, FOCUS, Heading, Notice, Spinner, field } from '@/components/club/ui';
import { Segmented } from '@/components/club/ui-extra';
import { clubFetch } from '@/components/club/api';
import { PropertyCard } from '@/components/club/properties/PropertyCard';
import { AMENITY_LABEL } from '@/components/club/properties/property-form';

function Marketplace() {
  const { me } = useClub();
  const eventId = useSearchParams()?.get('event') || null;
  const [tab, setTab] = useState<'search' | 'mine'>('search');
  const [filters, setFilters] = useState({ city: '', category: '', guests: '', max_rate: '', amenity: '' });
  const [list, setList] = useState<any[] | null>(null);
  const isBusiness = me.profile?.account_type === 'business';

  useEffect(() => {
    setList(null);
    const t = setTimeout(() => {
      const path = tab === 'mine' ? '/properties/mine' : `/properties?${new URLSearchParams(filters)}`;
      void clubFetch(path).then((r) => setList(r.ok ? r.data.properties : []));
    }, 250);
    return () => clearTimeout(t);
  }, [tab, filters]);
  const f = (k: keyof typeof filters) => ({ value: filters[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters((x) => ({ ...x, [k]: e.target.value })) });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Heading kicker="Stays" title="Verified partner properties">Every listing is checked by the Vibers Club team. Make a group offer from your approved plan.</Heading>
        {isBusiness && (
          <Link href="/club/properties/new" className={`mb-6 inline-flex h-10 items-center gap-1.5 rounded-full bg-[#c8da4a] px-5 text-sm font-bold text-[#14261b] hover:bg-[#bccf3b] ${FOCUS}`}>
            <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} /> List a property
          </Link>
        )}
      </div>
      {eventId && <div className="mb-4"><Notice tone="info">Choosing a stay for your plan. Open a property to make your group offer.</Notice></div>}
      {isBusiness && <div className="mb-4"><Segmented label="Stays" value={tab} options={[['search', 'Find stays'], ['mine', 'My listings']]} onChange={setTab} /></div>}
      {tab === 'search' && (
        <div className="mb-5 grid gap-2 sm:grid-cols-5">
          <input aria-label="City" className={field} placeholder="City" {...f('city')} />
          <select aria-label="Category" className={field} {...f('category')}><option value="">Any type</option><option value="hotel">Hotel</option><option value="cafe">Cafe</option><option value="restaurant">Restaurant</option></select>
          <input aria-label="Guests" className={field} inputMode="numeric" placeholder="Guests" {...f('guests')} />
          <input aria-label="Max nightly rate" className={field} inputMode="numeric" placeholder="Max ₹/night" {...f('max_rate')} />
          <select aria-label="Amenity" className={field} {...f('amenity')}><option value="">Any amenity</option>{Object.entries(AMENITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
      )}
      {!list ? <Spinner /> : list.length === 0
        ? <Empty title={tab === 'mine' ? 'No listings yet' : 'No stays match'}>{tab === 'mine' ? 'List your first property; staff verify it before it appears in search.' : 'Try another city or fewer filters.'}</Empty>
        : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <PropertyCard key={p.id} p={p} eventId={eventId} />)}</div>}
    </>
  );
}

export default function PropertiesPage() {
  return (
    <ClubShell>
      <Screen title="Stays" icon={Building2} back="/club/explore" width="wide">
        <Suspense fallback={<Spinner />}><Marketplace /></Suspense>
      </Screen>
    </ClubShell>
  );
}
