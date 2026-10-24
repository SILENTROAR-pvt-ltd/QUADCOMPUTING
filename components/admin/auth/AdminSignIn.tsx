'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { PasswordInput } from '@/components/host/auth/PasswordInput';
import { Field, input } from '@/components/host/workspaces/profile/ProfileFields';
import { useAdminSignIn } from './useAdminSignIn';

const link = 'font-semibold text-neutral-950 underline-offset-4 hover:underline disabled:opacity-50 cursor-pointer';

/** The platform's own sign-in, apart from the venue login: payments, plans and approvals for every venue. */
export function AdminSignIn({ next }: { next: string }) {
  const a = useAdminSignIn(next);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,#1f2a24,#0a0a0a_60%)] px-4 py-12 text-white sm:py-20">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-amber-200 ring-1 ring-white/15"><ShieldCheck className="h-5 w-5" aria-hidden /></span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-200/80">Vibers platform</p>
            <h1 className="font-serif text-3xl tracking-tight">Super admin</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/60">Payment and plan approvals for every venue. Venue owners use the venue login.</p>

        <div className="mt-8 rounded-3xl bg-white p-6 text-neutral-900 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] sm:p-8">
          {a.session?.isAdmin ? (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600">Signed in as <span className="font-semibold text-neutral-950">{a.session.email}</span></p>
              <button type="button" onClick={() => void a.openDesk()} disabled={a.busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 cursor-pointer">
                {a.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <>Open admin desk <ArrowRight className="h-4 w-4" aria-hidden /></>}
              </button>
              <button type="button" onClick={() => void a.signOut()} disabled={a.busy} className={`${link} text-sm`}>Sign out</button>
            </div>
          ) : (
            <>
              {a.session && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This browser is signed in as <span className="font-semibold">{a.session.email}</span>, a venue login.{' '}
                  <button type="button" onClick={() => void a.signOut()} disabled={a.busy} className={link}>Sign out</button> to sign in as super admin.
                </div>
              )}
              <form className="space-y-5" noValidate onSubmit={(e) => { e.preventDefault(); void a.signIn(email, password); }}>
                <Field label="Admin email">
                  <input autoComplete="username" inputMode="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin email" className={input} aria-invalid={Boolean(a.error) || undefined} />
                </Field>
                <Field label="Password">
                  <PasswordInput autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password" aria-invalid={Boolean(a.error) || undefined} />
                </Field>
                {a.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{a.error}</p>}
                <button type="submit" disabled={a.busy || !email || !password || Boolean(a.session)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                  {a.busy ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Signing in…</> : <>Sign in <ArrowRight className="h-4 w-4" aria-hidden /></>}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-sm text-white/50">Run a venue? <Link href="/auth/host" className="font-semibold text-white/80 underline-offset-4 hover:underline">Venue login</Link></p>
      </div>
    </div>
  );
}
