'use client';

import React, { useState } from 'react';
import { Check, KeyRound, Loader2, X } from 'lucide-react';
import { PasswordInput } from '@/components/host/auth/PasswordInput';
import { Field } from '@/components/host/workspaces/profile/ProfileFields';
import { Panel } from '../ui/Panel';
import { passwordProblems, usePasswordChange } from './usePasswordChange';

const RULES = ['At least 12 characters', 'Letters and numbers', 'At least one symbol'];

/** Change the super-admin password: current one first, the new one twice, with the rules shown as they are met. */
export function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [others, setOthers] = useState(true);
  const p = usePasswordChange();
  const problems = passwordProblems(next, current, confirm);
  const ready = Boolean(current && next && confirm) && problems.length === 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || p.busy) return;
    if (await p.change(current, next, others)) { setCurrent(''); setNext(''); setConfirm(''); }
  };

  return (
    <Panel title="Change password" note="For this super-admin login only. Venue logins are not affected.">
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_15rem]" noValidate>
        <div className="space-y-4">
          <Field label="Current password">
            <PasswordInput autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Your current password" />
          </Field>
          <Field label="New password">
            <PasswordInput autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password" />
          </Field>
          <Field label="New password again">
            <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type it once more"
              aria-invalid={Boolean(confirm && confirm !== next) || undefined} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" checked={others} onChange={(e) => setOthers(e.target.checked)} className="h-4 w-4 accent-neutral-900" />
            Sign out every other device
          </label>
          {p.result && (
            <p role={p.result.ok ? 'status' : 'alert'} className={`rounded-xl border px-3 py-2 text-sm ${p.result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{p.result.text}</p>
          )}
          <button type="submit" disabled={!ready || p.busy}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">
            {p.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />} {p.busy ? 'Changing…' : 'Change password'}
          </button>
        </div>
        <ul className="h-fit space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs" aria-label="Password rules">
          {[...RULES, 'Different from your current password', 'Both new passwords match'].map((r) => {
            const met = next.length > 0 && !problems.includes(r) && (r !== 'Both new passwords match' || Boolean(confirm));
            return (
              <li key={r} className={`flex items-center gap-2 ${met ? 'text-emerald-700' : 'text-neutral-500'}`}>
                {met ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />} {r}
              </li>
            );
          })}
        </ul>
      </form>
    </Panel>
  );
}
