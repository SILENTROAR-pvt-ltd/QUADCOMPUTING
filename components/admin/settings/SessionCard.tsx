'use client';

import React from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { ago, dateShort } from '../ui/format';
import { useAdminSession } from '../shell/useAdminSession';

/** Who is signed in, since when, and signing out here or on every device at once. */
export function SessionCard() {
  const s = useAdminSession();
  return (
    <Panel title="Your session" note="Super-admin access comes from the role on this login, set on the server only.">
      <dl className="grid gap-4 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-neutral-500">Signed in as</dt><dd className="mt-0.5 truncate font-semibold text-neutral-950">{s.email || '…'}</dd></div>
        <div><dt className="text-xs text-neutral-500">Role</dt><dd className="mt-0.5 inline-flex items-center gap-1.5 font-semibold text-neutral-950"><ShieldCheck className="h-4 w-4 text-amber-600" aria-hidden /> Super admin</dd></div>
        <div><dt className="text-xs text-neutral-500">Last sign-in</dt><dd className="mt-0.5 text-neutral-800">{s.lastSignIn ? `${dateShort(s.lastSignIn)} · ${ago(s.lastSignIn)}` : '—'}</dd></div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => void s.signOut('local')} disabled={s.leaving}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50 cursor-pointer">
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
        <button type="button" onClick={() => void s.signOut('global')} disabled={s.leaving}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer">
          <LogOut className="h-4 w-4" aria-hidden /> Sign out everywhere
        </button>
      </div>
    </Panel>
  );
}
