'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Plus } from 'lucide-react';
import { Avatar, FOCUS } from '../ui';
import type { ClubMe } from '../club-context';
import { Brand } from './Brand';
import { ADMIN, MORE, TABS, isActive, type NavItem } from './nav-items';
import { signOutOfClub } from './sign-out';

const ownPages = new Set(MORE.map((m) => m.href));

function Item({ item, on, count }: { item: NavItem; on: boolean; count?: number }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={on ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-[15px] font-semibold transition ${on ? 'bg-[#17301f] text-[#f6f4ec] shadow-[0_10px_22px_-14px_rgba(23,48,31,0.9)]' : 'text-[#14261b]/70 hover:bg-white hover:text-[#14261b]'} ${FOCUS}`}>
      <Icon aria-hidden="true" className={`h-5 w-5 ${on ? 'text-[#c8da4a]' : ''}`} strokeWidth={on ? 2.25 : 1.75} />
      {item.label}
      {count ? <span className={`ml-auto rounded-full px-1.5 text-[10px] font-bold ${on ? 'bg-[#c8da4a] text-[#14261b]' : 'bg-[#17301f] text-[#f6f4ec]'}`}>{count > 99 ? '99+' : count}</span> : null}
    </Link>
  );
}

/** The desktop sidebar: the five tabs, stays, notifications, profile, back office and a quick "host". */
export function Sidebar({ me }: { me: ClubMe }) {
  const path = usePathname() || '';
  const name = me.profile?.alias || me.profile?.club_username || 'Viber';
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#14261b]/[0.06] bg-[#ebe9df] px-4 py-6 lg:flex">
      <div className="px-2"><Brand /></div>
      <nav aria-label="Club" className="mt-9 space-y-1">
        {TABS.map((t) => <Item key={t.href} item={t} on={isActive(path, { ...t, also: t.also?.filter((h) => !ownPages.has(h)) })} />)}
      </nav>
      <div className="my-5 h-px bg-[#14261b]/[0.08]" />
      <nav aria-label="More" className="space-y-1">
        {MORE.map((t) => <Item key={t.href} item={t} on={isActive(path, t)} count={t.href === '/club/notifications' ? me.unreadNotifications : undefined} />)}
        {me.staffRole && <Item item={ADMIN} on={isActive(path, ADMIN)} />}
      </nav>
      <Link href="/club/events/new" className={`mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#c8da4a] text-sm font-bold text-[#14261b] shadow-[0_14px_28px_-16px_rgba(120,140,20,0.9)] transition hover:bg-[#bccf3b] ${FOCUS}`}>
        <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2.75} /> Host a plan
      </Link>
      <div className="mt-auto flex items-center gap-3 rounded-[22px] bg-white p-2.5 shadow-[0_12px_30px_-22px_rgba(20,38,27,0.6)]">
        <Link href="/club/pass" className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl ${FOCUS}`}>
          <Avatar url={me.profile?.avatar_url} name={name} size={38} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{name}</span>
            <span className="block truncate text-xs text-[#14261b]/60">View profile &amp; visa</span>
          </span>
        </Link>
        <button type="button" onClick={signOutOfClub} aria-label="Sign out" title="Sign out" className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#14261b]/60 hover:bg-[#f2f0e8] hover:text-[#14261b] ${FOCUS}`}>
          <LogOut aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
