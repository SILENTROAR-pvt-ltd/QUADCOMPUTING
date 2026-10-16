import { notFound, redirect } from 'next/navigation';
import { adminDb } from '@/lib/supabase/admin';
import { findVenueBySlug } from '@/lib/services/staff-auth/staff-login.service';
import { gatewayPath } from '@/lib/services/staff-auth/staff-roles';

export const dynamic = 'force-dynamic';

/** The older /pos/<slug> link: forwards to the venue's /pos/staff-login?business_id=… PIN screen. */
export default async function LegacyGatewayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = await findVenueBySlug(adminDb(), slug);
  if (!venue) notFound();
  redirect(gatewayPath(venue.id));
}
