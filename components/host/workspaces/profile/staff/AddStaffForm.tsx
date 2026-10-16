'use client';

import React, { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { STAFF_ROLES, type StaffRole } from '@/lib/services/staff-auth/staff-roles';

export const ROLE_LABEL: Record<StaffRole, string> = { WAITER: 'Waiter', CHEF: 'Chef', CASHIER: 'Cashier' };
const FIELD = 'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[16px] text-neutral-900 focus:border-neutral-900 focus:outline-none';

/** Name, role and a 4-digit PIN: one new person who can sign in at the venue's staff link. */
export function AddStaffForm({ onAdd }: { onAdd: (name: string, role: StaffRole, pin: string) => Promise<string | null> }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('WAITER');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const problem = await onAdd(name, role, pin);
    setBusy(false);
    if (problem) return setError(problem);
    setName('');
    setPin('');
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-dashed border-neutral-300 p-3" noValidate>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Add a staff member</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_9rem_7rem_auto]">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" maxLength={60} className={FIELD} />
        <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} aria-label="Role" className={FIELD}>
          {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" autoComplete="off" placeholder="4-digit PIN" aria-label="4-digit PIN" className={FIELD} />
        <button type="submit" disabled={busy} className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
    </form>
  );
}
