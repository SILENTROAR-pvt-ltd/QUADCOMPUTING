'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { useStaffAccess } from './staff/useStaffAccess';
import { AddStaffForm } from './staff/AddStaffForm';
import { StaffLinks } from './staff/StaffLinks';
import { StaffRow } from './staff/StaffRow';

/**
 * Staff access: who can sign in at the venue's staff link with a name and a 4-digit PIN, and as what. A waiter lands on
 * Live Tables, a chef on the kitchen display, a cashier on billing; none of them sees the owner's settings.
 */
export function StaffAccessSection() {
  const a = useStaffAccess();

  return (
    <section id="staff-access" aria-label="Staff access" className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700"><Users className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg text-neutral-950">Staff access</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
            Staff sign in on their own phone with their name and a 4-digit PIN, no email or password. Waiters see tables and orders, chefs the kitchen, cashiers billing, and only that.
          </p>
        </div>
      </div>

      {a.businessId && <StaffLinks businessId={a.businessId} />}

      {a.error && <p role="alert" className="mt-3 text-xs font-medium text-rose-600">{a.error}</p>}

      <ul className="mt-3 divide-y divide-neutral-100">
        {a.loading
          ? [0, 1].map((i) => <li key={i} className="py-3"><div className="shimmer h-10 rounded-lg" /></li>)
          : a.staff.length === 0
            ? <li className="py-4 text-center text-xs text-neutral-500">No staff yet. Add the first below.</li>
            : a.staff.map((m) => <StaffRow key={m.id} member={m} onChange={a.change} onRemove={a.remove} />)}
      </ul>

      <div className="mt-3"><AddStaffForm onAdd={a.add} /></div>
    </section>
  );
}
