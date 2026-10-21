'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UtensilsCrossed, Receipt, Users, UserRound, BedDouble } from 'lucide-react';
import { useStayHub } from '@/components/guest/stay/useStayHub';
import { showcaseUrl } from '@/components/stay/useStayShowcase';
import { addDays, todayIst } from '@/components/stay/stay-format';
import { prefetchJson } from '@/lib/guest/menu-seed';

export type GuestTab = 'menu' | 'stay' | 'bill' | 'lounge' | 'me';

export interface GuestTabBarProps {
  active: GuestTab;
  tableNumber: string;
  cafeId?: string;
  /** Running bill shown on the Bill tab (₹). */
  billTotal?: number;
  /** In-page switching (used on /menu). Without it every tab is a link. */
  onSelect?: (tab: Exclude<GuestTab, 'lounge' | 'stay'>) => void;
  /** Room mode: every link keeps the room, so the guest never drops back to a table menu wearing the room's label. */
  roomCode?: string;
}

/** Builds guest URLs that always carry the venue and table (losing cafe_id dropped guests out of their venue), and the room when there is one. */
export function guestHref(path: '/menu' | '/guest/lobby', tableNumber: string, cafeId?: string, tab?: string, roomCode?: string) {
  const q = new URLSearchParams({ table: tableNumber });
  if (cafeId) q.set('cafe_id', cafeId);
  if (roomCode) q.set('room', roomCode);
  if (tab) q.set('tab', tab);
  return `${path}?${q.toString()}`;
}

type TabDef = { id: GuestTab; label: string; icon: React.FC<{ className?: string }> };
const TABS: TabDef[] = [
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { id: 'bill', label: 'Bill', icon: Receipt },
  { id: 'lounge', label: 'Lounge', icon: Users },
  { id: 'me', label: 'Me', icon: UserRound },
];
const STAY_TAB: TabDef = { id: 'stay', label: 'Stay', icon: BedDouble };

/**
 * The single guest navigation, identical on every guest screen: Menu · (Stay) · Bill · Lounge · Me. Stay appears
 * beside Menu only at a venue with rooms, and opens its stay page, where reserving, checking in and the room all live.
 */
export function GuestTabBar({ active, tableNumber, cafeId, billTotal = 0, onSelect, roomCode }: GuestTabBarProps) {
  const router = useRouter();
  const { data: hub } = useStayHub(cafeId || '');
  const venueParam = hub?.venue.has_rooms ? hub.venue.slug || hub.venue.id : null;
  const stayHref = venueParam ? `/stay/${encodeURIComponent(venueParam)}` : null;
  const tabs = stayHref ? [TABS[0], STAY_TAB, ...TABS.slice(1)] : TABS;

  // Stay is one tap away: the route and its rooms for tonight are read now, so the page opens full, not on a skeleton.
  useEffect(() => {
    if (!stayHref || !venueParam) return;
    router.prefetch(stayHref);
    const today = todayIst();
    void prefetchJson(showcaseUrl(venueParam, today, addDays(today, 1)));
  }, [stayHref, venueParam, router]);

  return (
    <nav aria-label="Guest navigation" className="w-full flex justify-center pointer-events-none">
      <div className={`pointer-events-auto w-full max-w-md grid ${tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4'} rounded-[26px] border border-neutral-200/80 bg-white/95 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-1.5`}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          const content = (
            <>
              <span className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                {id === 'lounge' && !isActive && (
                  <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                )}
              </span>
              <span className="text-[11px] font-medium leading-none">
                {id === 'bill' && billTotal > 0 ? `₹${Math.round(billTotal)}` : label}
              </span>
            </>
          );
          const className = `flex flex-col items-center justify-center gap-1 rounded-[20px] py-2 min-h-[52px] transition-colors active:scale-95 cursor-pointer ${
            isActive ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'
          }`;

          if (id !== 'lounge' && id !== 'stay' && onSelect) {
            return (
              <button key={id} type="button" onClick={() => onSelect(id)} aria-current={isActive ? 'page' : undefined} className={className}>
                {content}
              </button>
            );
          }
          const href = id === 'stay' ? (stayHref as string)
            : id === 'lounge' ? guestHref('/guest/lobby', tableNumber, cafeId, undefined, roomCode)
            : guestHref('/menu', tableNumber, cafeId, id === 'menu' ? undefined : id, roomCode);
          return (
            <Link key={id} href={href} aria-current={isActive ? 'page' : undefined} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default GuestTabBar;
