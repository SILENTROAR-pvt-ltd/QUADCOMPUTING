'use client';

import React from 'react';
import Link from 'next/link';
import { Hourglass, ShieldAlert } from 'lucide-react';
import { AuthPanel } from './AuthPanel';
import { ClubProvider, useClubMeLoader, type ClubMe } from './club-context';
import { Button, Notice, Spinner } from './ui';
import { clubFetch } from './api';
import { Gate, StatusCard } from './nav/Gate';
import { Sidebar } from './nav/Sidebar';
import { BottomTabs } from './nav/BottomTabs';
import { signOutOfClub } from './nav/sign-out';

function DevBypassButton({ refresh }: { refresh: () => Promise<void> }) {
  const [busy, setBusy] = React.useState(false);
  if (process.env.NODE_ENV === 'production') return null;
  return (
    <div className="mt-4 border-t border-[#14261b]/10 pt-3">
      <Button type="button" tone="quiet" busy={busy} className="w-full py-2 text-xs"
        onClick={async () => {
          setBusy(true);
          const res = await clubFetch('/dev-bypass');
          setBusy(false);
          if (res.ok) await refresh();
        }}>
        ⚡ Dev mode: approve and enter the club now
      </Button>
    </div>
  );
}

/** The member app: sidebar on desktop, tab bar on phones, the page in between. */
function MemberApp({ me, refresh, children }: { me: ClubMe; refresh: () => Promise<void>; children: React.ReactNode }) {
  return (
    <ClubProvider me={me} refresh={refresh}>
      <Sidebar me={me} />
      <main className="min-h-dvh lg:pl-64">{children}</main>
      <BottomTabs />
    </ClubProvider>
  );
}

/**
 * Every members-only Club page: signs people in, routes applicants, and frames the member app.
 * `staff` pages (the back office) also open for Club staff who are not members themselves.
 */
export function ClubShell({ children, staff = false }: { children: React.ReactNode; staff?: boolean }) {
  const { state, refresh } = useClubMeLoader();

  if (state.status === 'loading') return <Gate><Spinner /></Gate>;
  if (state.status === 'error') {
    return <Gate><div className="mx-auto max-w-lg"><Notice>{state.code === 'not_ready' ? 'Vibers Club is not set up on this server yet.' : state.error}</Notice></div></Gate>;
  }
  const me = state.me;
  if (!me.signedIn) return <Gate><AuthPanel onDone={refresh} intro="Members sign in with their Vibers account. New here? Create one, then apply." /></Gate>;

  const status = me.profile?.status;
  if ((staff && me.staffRole) || status === 'approved') return <MemberApp me={me} refresh={refresh}>{children}</MemberApp>;
  if (!me.profile) {
    return (
      <Gate>
        <StatusCard icon={Hourglass} title="Apply for your Club Visa">
          <p>Vibers Club is application-only. It takes about three minutes.</p>
          <Link href="/club/apply" className="inline-flex"><Button tone="aura">Start my application</Button></Link>
          <DevBypassButton refresh={refresh} />
        </StatusCard>
      </Gate>
    );
  }
  if (status === 'pending') {
    return (
      <Gate>
        <StatusCard icon={Hourglass} title="Your application is in review">
          <p>We read every application by hand. You will get a notification here as soon as it is decided.</p>
          <DevBypassButton refresh={refresh} />
        </StatusCard>
      </Gate>
    );
  }
  if (status === 'rejected') {
    return (
      <Gate>
        <StatusCard icon={ShieldAlert} title="Not this time">
          {me.profile.review_note && <p className="rounded-2xl bg-[#14261b]/[0.05] px-4 py-3 text-[#14261b]/80">{me.profile.review_note}</p>}
          <Link href="/club/apply" className="inline-flex"><Button tone="quiet">Update and apply again</Button></Link>
          <DevBypassButton refresh={refresh} />
        </StatusCard>
      </Gate>
    );
  }
  return (
    <Gate>
      <StatusCard icon={ShieldAlert} title="Your Club Visa is revoked">
        <p>Contact Vibers Club support if you think this is a mistake.</p>
        <Button tone="quiet" onClick={signOutOfClub}>Sign out</Button>
      </StatusCard>
    </Gate>
  );
}
