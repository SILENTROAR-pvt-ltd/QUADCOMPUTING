'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { friendlyAuthError } from '@/lib/auth/auth-messages';
import { AuthShell } from '@/components/host/auth/AuthShell';
import { PasswordInput } from '@/components/host/auth/PasswordInput';
import { Field, input } from '@/components/host/workspaces/profile/ProfileFields';

export default function HostAuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setError(friendlyAuthError(signInError.message, 'Sign in failed. Check your email and password.'));
        return;
      }
      router.push('/host/control-center');
    } catch (err: any) {
      setError(friendlyAuthError(err?.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      aside={
        <p className="text-sm text-neutral-600">
          New here?{' '}
          <Link href="/onboarding/host" className="font-semibold text-neutral-950 underline-offset-4 hover:underline">Create host profile</Link>
        </p>
      }
    >
      <div className="w-full max-w-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d3b]">Host sign in</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-neutral-950">Welcome back</h1>
        <p className="mt-2 text-sm text-neutral-500">Sign in to run service, manage your menu and see tonight&apos;s numbers.</p>

        <form className="mt-8 space-y-5 rounded-3xl border border-neutral-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.35)] sm:p-8" onSubmit={handleSignIn} noValidate>
          <Field label="Email">
            <input
              autoComplete="email" inputMode="email" required type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@yourvenue.com"
              className={input} aria-invalid={Boolean(error) || undefined}
            />
          </Field>
          <Field label="Password">
            <PasswordInput
              autoComplete="current-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Your password"
              aria-invalid={Boolean(error) || undefined}
            />
          </Field>

          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</p>}

          <button
            type="submit" disabled={isSubmitting || !email || !password}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Signing in…</> : <>Sign in <ArrowRight aria-hidden="true" className="h-4 w-4" /></>}
          </button>
        </form>

        <p className="mt-6 text-sm">
          <Link href="/quad-computing" className="text-neutral-500 underline-offset-4 hover:text-neutral-950 hover:underline">← Back to Quad Computing</Link>
        </p>
      </div>
    </AuthShell>
  );
}
