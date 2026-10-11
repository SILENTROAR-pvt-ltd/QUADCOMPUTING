'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, CalendarHeart, Home, IdCard, LogOut, MessageCircle, Shield, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AURA } from '@/components/club/theme';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import type { ClubMe } from './club-context';

const LINKS = [
  { href: '/club', label: 'Home', icon: Home },
  { href: '/club/chat', label: 'Chat', icon: MessageCircle },
  { href: '/club/events', label: 'Plans', icon: CalendarHeart },
  { href: '/club/properties', label: 'Stays', icon: Building2 },
  { href: '/club/pass', label: 'Pass', icon: IdCard },
];

export async function signOutOfClub() {
  try { navigator.sendBeacon?.('/api/club/presence/leave'); } catch {}
  await createClient().auth.signOut({ scope: 'local' }).catch(() => {});
  window.location.href = '/join';
}

export function ClubNav({ me }: { me: ClubMe }) {
  const path = usePathname() || '';
  const active = (href: string) => (href === '/club' ? path === '/club' : path.startsWith(href));
  const links = me.staffRole ? [...LINKS, { href: '/club/admin', label: 'Admin', icon: Shield }] : LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-[#2a1250]/[0.07] bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/club" className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-6 w-6 rounded-full ${AURA}`} />
          <span className={`${DISPLAY} text-lg leading-none text-[#2a1250]`}>Vibers <em className="font-normal">Club</em></span>
        </Link>
        <nav aria-label="Club" className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${active(href) ? 'bg-[#7c3aed] text-white' : 'text-[#2a1250]/65 hover:text-[#2a1250]'}`}>
              <Icon aria-hidden="true" className="h-3.5 w-3.5" /> {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link href="/club/notifications" aria-label={`Notifications${me.unreadNotifications ? `, ${me.unreadNotifications} unread` : ''}`}
            className="relative grid h-9 w-9 place-items-center rounded-full text-[#2a1250]/70 hover:bg-[#2a1250]/[0.05]">
            <Bell aria-hidden="true" className="h-4 w-4" />
            {Boolean(me.unreadNotifications) && <span className={`absolute right-1 top-1 h-2 w-2 rounded-full ${AURA}`} />}
          </Link>
          <button type="button" onClick={signOutOfClub} aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-full text-[#2a1250]/70 hover:bg-[#2a1250]/[0.05]">
            <LogOut aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <nav aria-label="Club" className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {links.map(({ href, label }) => (
          <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${active(href) ? 'bg-[#7c3aed] text-white' : 'bg-white text-[#2a1250]/70'}`}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
