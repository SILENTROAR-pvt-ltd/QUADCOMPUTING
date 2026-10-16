'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ChefHat, ConciergeBell, Receipt, UserRound } from 'lucide-react';
import { press, SPRING } from '@/components/guest/menu/motion';
import { StaffKeypad } from './StaffKeypad';
import { useStaffLogin } from './useStaffLogin';
import type { StaffRole } from '@/lib/services/staff-auth/staff-roles';

export interface GatewayStaff { id: string; name: string; role: StaffRole }

const ROLE: Record<StaffRole, { label: string; Icon: typeof ConciergeBell }> = {
  WAITER: { label: 'Waiter', Icon: ConciergeBell },
  CHEF: { label: 'Kitchen', Icon: ChefHat },
  CASHIER: { label: 'Cashier', Icon: Receipt },
};

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

/** The staff sign-in: the venue's team as a list, then a 4-digit PIN on a keypad. No email, no password. */
export function StaffGateway({ businessId, venueName, staff }: { businessId: string; venueName: string; staff: GatewayStaff[] }) {
  const [chosen, setChosen] = useState<GatewayStaff | null>(null);
  const login = useStaffLogin(businessId);
  const back = () => { setChosen(null); login.reset(); };

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-8 pt-10">
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-400">Staff sign-in</p>
      <h1 className="mt-1 text-center text-3xl leading-tight text-neutral-950" style={SERIF}>{venueName}</h1>

      {!chosen ? (
        <section aria-label="Who is signing in" className="mt-8 flex-1">
          <p className="mb-3 text-center text-sm text-neutral-500">Tap your name</p>
          {staff.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
              No staff have a PIN yet. The owner can add them in My profile → Staff access.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {staff.map((s) => {
                const { Icon, label } = ROLE[s.role];
                return (
                  <li key={s.id}>
                    <motion.button type="button" onClick={() => setChosen(s)} {...press}
                      className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-5 shadow-sm">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-neutral-950 text-lg font-semibold text-white">{s.name.trim().charAt(0).toUpperCase() || <UserRound className="h-6 w-6" />}</span>
                      <span className="max-w-full truncate text-[15px] font-semibold text-neutral-950">{s.name}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600"><Icon className="h-3 w-3" aria-hidden /> {label}</span>
                    </motion.button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <motion.section key={chosen.id} aria-label={`PIN for ${chosen.name}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="mt-6 flex-1">
          <button type="button" onClick={back} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-medium text-neutral-600"><ArrowLeft className="h-4 w-4" aria-hidden /> Not {chosen.name}?</button>
          <div className="mt-2 text-center">
            <p className="text-xl font-semibold text-neutral-950">Hello, {chosen.name}</p>
            <p className="text-sm text-neutral-500">Enter your 4-digit PIN</p>
          </div>
          <StaffKeypad pin={login.pin} onChange={(p) => login.setPin(p, chosen.id)} disabled={login.busy} wrong={login.wrong} />
          <p role="alert" aria-live="polite" className="mt-3 min-h-[1.25rem] text-center text-sm font-medium text-rose-600">{login.error}</p>
        </motion.section>
      )}

      <p className="mt-6 text-center text-xs text-neutral-400">
        Owner? <Link href="/auth/host" className="font-medium text-neutral-600 underline underline-offset-2">Open the control center</Link>
      </p>
    </main>
  );
}
