'use client';

import React from 'react';
import Link from 'next/link';
import { LogOut, ShieldCheck } from 'lucide-react';
import { ADMIN_NAV_GROUPS, type BadgeKey } from './nav';

interface Props {
  current: string;
  counts: Partial<Record<BadgeKey, number>>;
  email: string | null;
  leaving: boolean;
  onSignOut: () => void;
}

/** The black sidebar: brand, the General and Account groups (with what is waiting as badges), the signed-in admin. */
export function AdminSidebar({ current, counts, email, leaving, onSignOut }: Props) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[15.5rem] flex-col bg-[#0b0b0b] px-4 py-6 text-white lg:flex">
      <Link href="/admin" className="flex items-center gap-3 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#0b0b0b]"><ShieldCheck className="h-4 w-4" aria-hidden /></span>
        <span>
          <span className="block text-[15px] font-semibold tracking-tight">Vibers Connect</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">Command center</span>
        </span>
      </Link>

      <nav aria-label="Admin sections" className="mt-8 flex-1 space-y-7">
        {ADMIN_NAV_GROUPS.map((g) => (
          <div key={g.label}>
            <p className="px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">{g.label}</p>
            <ul className="mt-2 space-y-1">
              {g.items.map((n) => {
                const on = n.href === current;
                const Icon = n.icon;
                const badge = n.badge ? counts[n.badge] || 0 : 0;
                return (
                  <li key={n.href}>
                    <Link href={n.href} aria-current={on ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors ${on ? 'bg-white/[0.12] font-medium text-white' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'}`}>
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                      <span className="flex-1">{n.label}</span>
                      {badge > 0 && <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-300">{String(badge).padStart(2, '0')}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-2 pt-4">
        <p className="truncate text-xs text-white/70">{email || '…'}</p>
        <button type="button" onClick={onSignOut} disabled={leaving}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-rose-300 disabled:opacity-50 cursor-pointer">
          <LogOut className="h-3.5 w-3.5" aria-hidden /> {leaving ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
