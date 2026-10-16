import { notFound, redirect } from 'next/navigation';
import { adminDb } from '@/lib/supabase/admin';
import { findVenueById, listLoginStaff } from '@/lib/services/staff-auth/staff-login.service';
import { roleForTerminal, terminalPath } from '@/lib/services/staff-auth/staff-roles';
import { currentStaff } from '@/lib/services/staff-auth/terminal-access';
import { StaffGateway } from '@/components/pos/StaffGateway';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Staff sign-in', robots: { index: false, follow: false } };

/**
 * /pos/staff-login?business_id=<venue>[&tab=waiter|kitchen|cashier]: the staff PIN screen. A `tab` lists only the people
 * with that role (a kitchen tablet shows chefs). Someone already signed in goes straight to their own terminal.
 */
export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<{ business_id?: string; tab?: string }> }) {
  const { business_id, tab } = await searchParams;
  const db = adminDb();
  const venue = await findVenueById(db, business_id);
  if (!venue) notFound();

  const staff = await currentStaff(venue);
  if (staff) redirect(terminalPath(venue.id, staff.role));

  const only = tab ? roleForTerminal(tab) : null;
  const team = (await listLoginStaff(db, venue.id)).filter((s) => !only || s.role === only);
  return <StaffGateway businessId={venue.id} venueName={venue.name} staff={team} />;
}
