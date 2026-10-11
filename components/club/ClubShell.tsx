'use client';

import React from 'react';
import Link from 'next/link';
import { Hourglass, ShieldAlert } from 'lucide-react';
import { AuthPanel } from './AuthPanel';
import { ClubNav, signOutOfClub } from './ClubNav';
import { ClubProvider, useClubMeLoader } from './club-context';
import { usePresence } from './usePresence';
import { Button, Card, Notice, Spinner } from './ui';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { AURA } from './theme';

import { clubFetch } from './api';

function DevBypassButton({ refresh }: { refresh: () => Promise<void> }) {
  const [busy, setBusy] = React.useState(false);
  if (process.env.NODE_ENV === 'production') return null;
  return (
    <div className="mt-4 pt-3 border-t border-[#2a1250]/10">
      <Button
        type="button"
        tone="quiet"
        busy={busy}
        className="w-full bg-violet-100 text-violet-950 hover:bg-violet-200 text-xs py-2"
        onClick={async () => {
          setBusy(true);
          const res = await clubFetch('/dev-bypass');
          setBusy(false);
          if (res.ok) await refresh();
        }}
      >
        ⚡ Dev Mode: Approve & Enter Club Now
      </Button>
    </div>
  );
}

/** Page frame. Members get the club nav; everyone else (signing in, applicants) a simple brand bar. */
function Frame({ children, withNav = false }: { children: React.ReactNode; withNav?: boolean }) {
  return (
    <>
      {!withNav && (
        <header className="border-b border-[#2a1250]/[0.07]">
          <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
            <Link href="/join" className="flex items-center gap-2">
              <span aria-hidden="true" className={`h-6 w-6 rounded-full ${AURA}`} />
              <span className={`${DISPLAY} text-lg`}>Vibers <em className="font-normal">Club</em></span>
            </Link>
          </div>
        </header>
      )}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </>
  );
}

function StatusCard({ icon: Icon, title, children }: { icon: typeof Hourglass; title: string; children: React.ReactNode }) {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <Icon aria-hidden="true" className="mx-auto h-8 w-8 text-[#be185d]" />
      <h1 className={`${DISPLAY} mt-3 text-3xl`}>{title}</h1>
      <div className="mt-3 space-y-4 text-sm text-[#2a1250]/65">{children}</div>
    </Card>
  );
}

/**
 * Every members-only Club page: signs people in, routes applicants, and runs live presence.
 * `staff` pages (the back office) also open for Club staff who are not members themselves.
 */
export function ClubShell({ children, staff = false }: { children: React.ReactNode; staff?: boolean }) {
  const { state, refresh } = useClubMeLoader();
  const approved = state.status === 'ready' && state.me.profile?.status === 'approved';
  usePresence(approved);

  if (state.status === 'loading') return <Frame><Spinner /></Frame>;
  if (state.status === 'error') {
    return <Frame><Notice>{state.code === 'not_ready' ? 'Vibers Club is not set up on this server yet.' : state.error}</Notice></Frame>;
  }
  const me = state.me;
  if (!me.signedIn) return <Frame><AuthPanel onDone={refresh} intro="Members sign in with their Vibers account. New here? Create one, then apply." /></Frame>;

  const status = me.profile?.status;
  if (staff && me.staffRole) {
    return <ClubProvider me={me} refresh={refresh}><ClubNav me={me} /><Frame withNav>{children}</Frame></ClubProvider>;
  }
  if (!me.profile) {
    return (
      <Frame>
        <StatusCard icon={Hourglass} title="Apply for your Viber Pass">
          <p>Vibers Club is application-only. It takes about three minutes.</p>
          <Link href="/club/apply" className="inline-flex"><Button tone="aura">Start my application</Button></Link>
          <DevBypassButton refresh={refresh} />
        </StatusCard>
      </Frame>
    );
  }
  if (status === 'pending') {
    return (
      <Frame>
        <StatusCard icon={Hourglass} title="Your application is in review">
          <p>We read every application by hand. You will get a notification here as soon as it is decided.</p>
          <DevBypassButton refresh={refresh} />
        </StatusCard>
      </Frame>
    );
  }
  if (status === 'rejected') {
    return (
      <Frame>
        <StatusCard icon={ShieldAlert} title="Not this time">
          {me.profile.review_note && <p className="rounded-2xl bg-[#f3ebff]/70 px-4 py-3 text-[#2a1250]/80">{me.profile.review_note}</p>}
          <Link href="/club/apply" className="inline-flex"><Button tone="quiet">Update and apply again</Button></Link>
          <DevBypassButton refresh={refresh} />
        </StatusCard>
      </Frame>
    );
  }
  if (status !== 'approved') {
    return <Frame><StatusCard icon={ShieldAlert} title="Your Viber Pass is revoked"><p>Contact Vibers Club support if you think this is a mistake.</p><Button tone="quiet" onClick={signOutOfClub}>Sign out</Button></StatusCard></Frame>;
  }

  return (
    <ClubProvider me={me} refresh={refresh}>
      <ClubNav me={me} />
      <Frame withNav>{children}</Frame>
    </ClubProvider>
  );
}
