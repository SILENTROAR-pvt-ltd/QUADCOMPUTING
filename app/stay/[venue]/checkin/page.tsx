import type { Metadata } from 'next';
import { SelfCheckInPage } from '@/components/stay/checkin/SelfCheckInPage';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Self check-in · Vibers Connect', robots: { index: false } };

export default async function CheckInPage({ params }: { params: Promise<{ venue: string }> }) {
  const { venue } = await params;
  return <SelfCheckInPage venueParam={decodeURIComponent(venue)} />;
}
