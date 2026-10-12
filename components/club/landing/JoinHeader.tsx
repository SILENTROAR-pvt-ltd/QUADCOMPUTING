'use client';

import React from 'react';
import Link from 'next/link';
import { useClubMeLoader } from '../club-context';
import { FOCUS } from '../ui';
import { Brand } from '../nav/Brand';

/** The landing's top bar: "Sign in", or "Open the club" for someone already signed in. */
export function JoinHeader() {
  const { state } = useClubMeLoader();
  const member = state.status === 'ready' && state.me.signedIn;
  return (
    <header className="sticky top-0 z-30 bg-[#f1efe6]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Brand href="/join" />
        <Link href="/club" className={`inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold transition ${member ? 'bg-[#17301f] text-[#f6f4ec] hover:bg-[#22432c]' : 'bg-white shadow-[0_8px_22px_-16px_rgba(20,38,27,0.6)] ring-1 ring-[#14261b]/[0.06] hover:bg-[#fbfaf6]'} ${FOCUS}`}>
          {member ? 'Open the club' : 'Sign in'}
        </Link>
      </div>
    </header>
  );
}
