'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { ADMIN_NAV, activeNav, type BadgeKey } from './nav';
import { AdminSidebar } from './AdminSidebar';
import { useAdminSession } from './useAdminSession';
import { useAdminData } from '../ui/useAdminData';

/**
 * The super admin's frame: the black sidebar on desktop (a scrolling pill row on phones) and the page beside it. The
 * dashboard draws its own welcome header; every other section gets its title here.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/admin';
  const current = activeNav(pathname);
  const session = useAdminSession();
  const { data } = useAdminData<{ counts: Partial<Record<BadgeKey, number>> }>('/api/admin/counts', 60_000);
  const counts = data?.counts || {};

  return (
    <div className="min-h-screen bg-[#f4f4f2] text-neutral-900 antialiased">
      <AdminSidebar current={current.href} counts={counts} email={session.email} leaving={session.leaving} onSignOut={() => void session.signOut()} />

      <div className="sticky top-0 z-20 bg-[#0b0b0b] px-4 pb-3 pt-4 text-white lg:hidden">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Vibers Connect <span className="font-normal text-white/50">· Command center</span></p>
          <button type="button" onClick={() => void session.signOut()} aria-label="Sign out" className="text-white/60 hover:text-white cursor-pointer"><LogOut className="h-4 w-4" /></button>
        </div>
        <nav aria-label="Admin sections" className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
          {ADMIN_NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={n.href === current.href ? 'page' : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${n.href === current.href ? 'bg-white text-neutral-950' : 'text-white/70'}`}>{n.label}</Link>
          ))}
        </nav>
      </div>

      <main className="px-4 py-6 sm:px-6 lg:ml-[15.5rem] lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1280px]">
          {current.href !== '/admin' && (
            <header className="mb-6">
              <h1 className="text-[22px] font-semibold tracking-tight text-neutral-950">{current.label}</h1>
              <p className="mt-1 text-[13px] text-neutral-500">{current.note}</p>
            </header>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
