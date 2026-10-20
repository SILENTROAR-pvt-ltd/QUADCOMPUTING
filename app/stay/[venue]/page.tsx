import type { Metadata } from 'next';
import { StayShowcasePage } from '@/components/stay/StayShowcasePage';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Stay · Vibers Connect' };

/** The public room showcase and reservation page for a venue, by slug or id. */
export default async function StayPage({ params }: { params: Promise<{ venue: string }> }) {
  const { venue } = await params;
  return <StayShowcasePage venueParam={decodeURIComponent(venue)} />;
}
