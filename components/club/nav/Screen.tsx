'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, type LucideIcon } from 'lucide-react';
import { Avatar, FOCUS } from '../ui';
import { useClub } from '../club-context';
import { CLUB_DISPLAY } from '../fonts';

const WIDTH = { feed: 'max-w-2xl', page: 'max-w-5xl', wide: 'max-w-6xl' } as const;
const ROUND = `grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#14261b] shadow-[0_6px_18px_-12px_rgba(20,38,27,0.6)] ring-1 ring-[#14261b]/[0.06] transition hover:bg-[#fbfaf6] ${FOCUS}`;

interface ScreenProps {
  title: React.ReactNode;
  icon?: LucideIcon;
  /** Show a back arrow; the href is where it goes when there is no history to go back to. */
  back?: string;
  actions?: React.ReactNode;
  width?: keyof typeof WIDTH;
  /** Content fills the screen above the tab bar (chat), instead of scrolling with room for the "+". */
  fill?: boolean;
  children: React.ReactNode;
}

/** One member page: a calm title bar (round back button, serif title, bell, your face) and the content. */
export function Screen({ title, icon: Icon, back, actions, width = 'page', fill = false, children }: ScreenProps) {
  const { me } = useClub();
  const router = useRouter();
  const name = me.profile?.alias || me.profile?.club_username || 'Viber';
  const unread = me.unreadNotifications || 0;
  const goBack = () => (window.history.length > 1 ? router.back() : router.push(back || '/club'));

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#f1efe6]/92 backdrop-blur-md">
        <div className={`mx-auto flex h-[72px] items-center gap-3 px-4 sm:px-6 ${WIDTH[width]}`}>
          {back && <button type="button" onClick={goBack} aria-label="Back" className={ROUND}><ArrowLeft aria-hidden="true" className="h-5 w-5" /></button>}
          <h1 className={`${CLUB_DISPLAY} flex min-w-0 items-center gap-2 text-[26px] font-semibold tracking-tight`}>
            <span className="truncate">{title}</span>
            {Icon && <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#3c6b2b]" />}
          </h1>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {actions}
            <Link href="/club/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className={`relative lg:hidden ${ROUND}`}>
              <Bell aria-hidden="true" className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[#c8da4a] ring-2 ring-white" />}
            </Link>
            <Link href="/club/pass" aria-label="Your profile" className={`rounded-full lg:hidden ${FOCUS}`}>
              <Avatar url={me.profile?.avatar_url} name={name} size={42} ring />
            </Link>
          </div>
        </div>
      </header>
      <div className={`mx-auto w-full px-4 pt-3 sm:px-6 ${fill ? 'pb-[calc(6.25rem+env(safe-area-inset-bottom))] lg:pb-6' : 'pb-36 lg:pb-16'} ${WIDTH[width]}`}>{children}</div>
    </>
  );
}
