import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveHostBusinesses } from '@/lib/auth/guards';
import { getVerifiedUser } from '@/lib/auth/verified-user';
import { hostRepository } from '@/lib/repository/host.repository';
import { HostWorkspaceHydrator } from '@/components/host/HostWorkspaceHydrator';
import ControlCenterWorkspace from '@/components/host/ControlCenterWorkspace';

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

export default async function HostControlCenterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [supabase, params] = await Promise.all([createClient(), searchParams]);
  const user = await getVerifiedUser(supabase);
  // middleware already guarantees a real session reaches this page.
  const { businesses, error } = await resolveHostBusinesses(user!.id, supabase);

  // A real DB error is not the same as "no business yet" — let it throw so
  // the existing error.tsx boundary renders instead of bouncing a legitimate
  // host into onboarding because of a transient query failure.
  if (error) throw error;

  if (!businesses || businesses.length === 0) {
    redirect('/onboarding/host');
  }

  // The venue is always shown in the URL. It is resolved here, server-side,
  // before anything renders: a missing or foreign business_id is replaced by
  // the host's own venue in a single redirect, so the page never paints with
  // the wrong (or no) id. APIs still re-check ownership on every call.
  const requested = first(params.business_id) || first(params.cafe_id) || first(params.venue);
  const active = businesses.find((b: any) => b.id === requested) || businesses[0];
  if (requested !== active.id || params.cafe_id || params.venue) {
    const next = new URLSearchParams();
    next.set('business_id', active.id);
    next.set('tab', first(params.tab) || 'billing');
    redirect(`/host/control-center?${next.toString()}`);
  }

  const snapshot = await hostRepository.load(supabase, user!.id, active, user!.email);

  return (
    <div className="min-h-screen w-full bg-[#faf9f6]">
      <HostWorkspaceHydrator serverSnapshot={snapshot} businessId={active.id} />
      <ControlCenterWorkspace
        initialBusinessId={active.id}
        initialBusinessName={active.business_name || active.name || 'Venue'}
      />
    </div>
  );
}
