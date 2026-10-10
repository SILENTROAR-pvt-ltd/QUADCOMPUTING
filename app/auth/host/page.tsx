'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message || 'Sign in failed. Check your email and password.');
        return;
      }
      router.push('/host/control-center');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="light-shell flex min-h-screen flex-col items-center justify-center bg-white p-4 text-center text-black">
      <div className="max-w-xl w-full">
        <p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          Quad Computing
        </p>
        <h1 className="font-serif text-3xl font-normal text-white md:text-4xl">
          Host Authentication
        </h1>
        <p className="mt-6 text-sm leading-7 text-zinc-400">
          Sign in to manage your enterprise portfolio, view analytics, and control your venues.
        </p>

        <form className="mt-10 space-y-4 text-left" onSubmit={handleSignIn}>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-white/20 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-white/50"
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500" htmlFor="password">
              Password
            </label>
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-white/20 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-white/50"
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="mt-8 flex gap-4 justify-center">
            <Link
              className="inline-flex h-11 items-center justify-center border border-white/20 px-6 text-[10px] uppercase tracking-[0.2em] text-white transition-colors hover:border-white/50 hover:bg-zinc-900"
              href="/"
            >
              Back
            </Link>
            <button
              className="inline-flex h-11 items-center justify-center bg-white px-6 text-[10px] uppercase tracking-[0.2em] text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>

        <p className="mt-8 text-sm text-zinc-400">
          New host?{' '}
          <Link className="text-white underline" href="/onboarding/host">
            Create Host Profile
          </Link>
        </p>
      </div>
    </main>
  );
}
