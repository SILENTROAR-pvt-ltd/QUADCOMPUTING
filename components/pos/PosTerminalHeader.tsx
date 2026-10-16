'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { press } from '@/components/guest/menu/motion';
import { gatewayPath, terminalPath, type StaffRole } from '@/lib/services/staff-auth/staff-roles';

const LABEL: Record<StaffRole, string> = { WAITER: 'Waiter', CHEF: 'Kitchen', CASHIER: 'Cashier' };
const TERMINALS: StaffRole[] = ['WAITER', 'CHEF', 'CASHIER'];

interface PosTerminalHeaderProps {
  venueId: string;
  venueName: string;
  actor: { name: string; role: StaffRole | 'OWNER' };
  terminal: StaffRole;
}

/** Who is signed in at which terminal, with Sign out. The owner also gets a switch between the three terminals. */
export function PosTerminalHeader({ venueId, venueName, actor, terminal }: PosTerminalHeaderProps) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const owner = actor.role === 'OWNER';

  const signOut = async () => {
    setLeaving(true);
    try { await fetch('/api/auth/staff-pin', { method: 'DELETE' }); } finally { router.replace(owner ? '/host/control-center' : gatewayPath(venueId)); router.refresh(); }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">{venueName}</p>
          <p className="truncate text-sm font-semibold text-neutral-950">{actor.name} <span className="font-normal text-neutral-500">· {LABEL[terminal]}</span></p>
        </div>
        {owner && (
          <nav aria-label="Terminals" className="hidden gap-1 rounded-xl bg-neutral-100 p-1 sm:flex">
            {TERMINALS.map((t) => (
              <Link key={t} href={terminalPath(venueId, t)} aria-current={t === terminal ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${t === terminal ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}>{LABEL[t]}</Link>
            ))}
          </nav>
        )}
        <motion.button type="button" onClick={() => void signOut()} disabled={leaving} {...press}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-700 disabled:opacity-50">
          <LogOut className="h-4 w-4" aria-hidden /> {owner ? 'Back' : 'Sign out'}
        </motion.button>
      </div>
    </header>
  );
}
