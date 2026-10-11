'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Pencil, Users } from 'lucide-react';
import { Badge, Card, Notice, Spinner } from '../ui';
import { clubFetch, rupees } from '../api';
import { ReportButton } from '../ReportButton';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { AMENITY_LABEL } from './property-form';
import { OfferForm } from './OfferForm';

export function PropertyDetail({ id, eventId }: { id: string; eventId: string | null }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { void clubFetch(`/properties/${id}`).then((r) => (r.ok ? setData(r.data) : setError(r.error))); }, [id]);
  if (error) return <Notice>{error}</Notice>;
  if (!data) return <Spinner />;
  const { property: p, owner, mine } = data;
  const map = p.lat != null && p.lng != null ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}` : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        {p.photos.length > 0 && (
          <div className="flex snap-x gap-2 overflow-x-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.photos.map((url: string, i: number) => <img key={i} src={url} alt={`${p.name} photo ${i + 1}`} className="aspect-[16/10] w-full shrink-0 snap-start rounded-3xl object-cover sm:w-[80%]" />)}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {p.categories.map((c: string) => <Badge key={c}>{c}</Badge>)}
          <Badge tone={p.status === 'verified' ? 'good' : 'warn'}>{p.status === 'verified' ? 'Verified by Vibers Club' : p.status}</Badge>
        </div>
        <h1 className={`${DISPLAY} text-3xl sm:text-4xl`}>{p.name}</h1>
        <p className="flex flex-wrap gap-4 text-sm text-[#2a1250]/65">
          <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{p.address}, {p.city}, {p.state}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />Groups up to {p.capacity}</span>
          {map && <a href={map} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Open map</a>}
        </p>
        {p.status !== 'verified' && p.review_note && <Notice tone="info">Staff note: {p.review_note}</Notice>}
        <Card className="space-y-4">
          <p className="text-xl font-semibold">{rupees(p.price_min)} – {rupees(p.price_max)} <span className="text-sm font-normal text-[#2a1250]/55">per night, open to group offers</span></p>
          {p.description && <p className="whitespace-pre-line text-sm leading-relaxed">{p.description}</p>}
          {p.amenities.length > 0 && <div className="flex flex-wrap gap-1.5">{p.amenities.map((a: string) => <Badge key={a}>{AMENITY_LABEL[a] || a}</Badge>)}</div>}
          {p.house_rules && <div><p className="text-xs font-semibold uppercase tracking-wider text-[#2a1250]/45">House rules</p><p className="mt-1 whitespace-pre-line text-sm">{p.house_rules}</p></div>}
          {p.terms && <div><p className="text-xs font-semibold uppercase tracking-wider text-[#2a1250]/45">Terms</p><p className="mt-1 whitespace-pre-line text-sm">{p.terms}</p></div>}
        </Card>
        <div className="flex items-center justify-between text-sm text-[#2a1250]/60">
          <span>Listed by {owner?.name ?? 'a member'}</span>
          {mine ? <Link href={`/club/properties/${p.id}/edit`} className="inline-flex items-center gap-1 font-semibold text-[#2a1250] underline"><Pencil className="h-3.5 w-3.5" /> Edit listing</Link> : <ReportButton type="property" id={p.id} />}
        </div>
      </div>
      <aside>{!mine && p.status === 'verified' ? <OfferForm propertyId={p.id} preselect={eventId} /> : null}</aside>
    </div>
  );
}
