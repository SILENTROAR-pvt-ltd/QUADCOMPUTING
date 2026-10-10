'use client';

import React from 'react';
import Link from 'next/link';
import { UtensilsCrossed, Receipt, Users, UserRound } from 'lucide-react';

export type GuestTab = 'menu' | 'bill' | 'lounge' | 'me';

export interface GuestTabBarProps {
  active: GuestTab;
  tableNumber: string;
  cafeId?: string;
  /** Running bill shown on the Bill tab (₹). */
  billTotal?: number;
  /** In-page switching (used on /menu). Without it every tab is a link. */
  onSelect?: (tab: Exclude<GuestTab, 'lounge'>) => void;
}

/** Builds guest URLs that always carry the venue and table (losing cafe_id dropped guests out of their venue). */
export function guestHref(path: '/menu' | '/guest/lobby', tableNumber: string, cafeId?: string, tab?: string) {
  const q = new URLSearchParams({ table: tableNumber });
  if (cafeId) q.set('cafe_id', cafeId);
  if (tab) q.set('tab', tab);
  return `${path}?${q.toString()}`;
}

const TABS: Array<{ id: GuestTab; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { id: 'bill', label: 'Bill', icon: Receipt },
  { id: 'lounge', label: 'Lounge', icon: Users },
  { id: 'me', label: 'Me', icon: UserRound },
];

/**
 * The single guest navigation, identical on every guest screen:
 * Menu · Bill · Lounge · Me. Replaces the two different floating docks.
 */
export function GuestTabBar({ active, tableNumber, cafeId, billTotal = 0, onSelect }: GuestTabBarProps) {
  return (
    <nav aria-label="Guest navigation" className="w-full flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md grid grid-cols-4 rounded-[26px] border border-neutral-200/80 bg-white/95 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => {
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

          if (id !== 'lounge' && onSelect) {
            return (
              <button key={id} type="button" onClick={() => onSelect(id)} aria-current={isActive ? 'page' : undefined} className={className}>
                {content}
              </button>
            );
          }
          const href = id === 'lounge'
            ? guestHref('/guest/lobby', tableNumber, cafeId)
            : guestHref('/menu', tableNumber, cafeId, id === 'menu' ? undefined : id);
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
