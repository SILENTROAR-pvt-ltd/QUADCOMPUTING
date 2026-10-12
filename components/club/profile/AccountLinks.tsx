'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, Building2, ChevronRight, LogOut, Shield } from 'lucide-react';
import { FOCUS } from '../ui';
import { useClub } from '../club-context';
import { signOutOfClub } from '../nav/sign-out';

const row = `flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] transition hover:bg-[#14261b]/[0.04] ${FOCUS}`;

/** Account shortcuts, so phones (no sidebar) can reach notifications, stays, the back office and sign out. */
export function AccountLinks() {
  const { me } = useClub();
  const unread = me.unreadNotifications || 0;
  return (
    <section aria-label="Account" className="divide-y divide-[#14261b]/[0.06] overflow-hidden rounded-3xl border border-[#14261b]/[0.07] bg-[#fbfaf6]">
      <Link href="/club/notifications" className={row}>
        <Bell aria-hidden="true" className="h-5 w-5 text-[#3c6b2b]" /> Notifications
        {unread > 0 && <span className="ml-auto rounded-full bg-[#c8da4a] px-2 text-xs font-bold text-[#14261b]">{unread}</span>}
        <ChevronRight aria-hidden="true" className={`h-4 w-4 text-[#14261b]/60 ${unread ? '' : 'ml-auto'}`} />
      </Link>
      <Link href="/club/properties" className={row}><Building2 aria-hidden="true" className="h-5 w-5 text-[#3c6b2b]" /> Verified stays<ChevronRight aria-hidden="true" className="ml-auto h-4 w-4 text-[#14261b]/60" /></Link>
      {me.staffRole && <Link href="/club/admin" className={row}><Shield aria-hidden="true" className="h-5 w-5 text-[#3c6b2b]" /> Back office<ChevronRight aria-hidden="true" className="ml-auto h-4 w-4 text-[#14261b]/60" /></Link>}
      <button type="button" onClick={signOutOfClub} className={`${row} text-red-700`}><LogOut aria-hidden="true" className="h-5 w-5" /> Sign out</button>
    </section>
  );
}
