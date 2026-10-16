import { notFound, redirect } from 'next/navigation';
import { isVenueId } from '@/lib/services/staff-auth/staff-login.service';
import { gatewayPath, roleForTerminal } from '@/lib/services/staff-auth/staff-roles';
import { resolveTerminalAccess } from '@/lib/services/staff-auth/terminal-access';
import { PosTerminal } from '@/components/pos/PosTerminal';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Staff terminal', robots: { index: false, follow: false } };

/**
 * /pos/terminal?business_id=<venue>&tab=waiter|kitchen|cashier. The `tab` is only a request: a signed-in staff member
 * always gets their own role's terminal whatever it says, the venue's owner may open any, and anyone else is sent to PIN sign-in.
 */
export default async function PosTerminalPage({ searchParams }: { searchParams: Promise<{ business_id?: string; tab?: string }> }) {
  const { business_id, tab } = await searchParams;
  if (!isVenueId(business_id)) notFound();
  const role = roleForTerminal(tab ?? '');
  if (!role) redirect(gatewayPath(business_id.toLowerCase()));

  const access = await resolveTerminalAccess(business_id, role);
  if (!access.ok) {
    if (access.reason === 'NO_VENUE') notFound();
    redirect(access.to);
  }
  return <PosTerminal terminal={role} venueId={access.venue.id} venueName={access.venue.name} actor={access.actor} />;
}
