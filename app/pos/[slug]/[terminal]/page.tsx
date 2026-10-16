import { notFound, redirect } from 'next/navigation';
import { adminDb } from '@/lib/supabase/admin';
import { findVenueBySlug } from '@/lib/services/staff-auth/staff-login.service';
import { roleForTerminal, terminalPath } from '@/lib/services/staff-auth/staff-roles';

export const dynamic = 'force-dynamic';

/** The older /pos/<slug>/waiter link: forwards to /pos/terminal?business_id=…&tab=…, where access is decided. */
export default async function LegacyTerminalPage({ params }: { params: Promise<{ slug: string; terminal: string }> }) {
  const { slug, terminal } = await params;
  const role = roleForTerminal(terminal);
  const venue = role ? await findVenueBySlug(adminDb(), slug) : null;
  if (!role || !venue) notFound();
  redirect(terminalPath(venue.id, role));
}
