'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { friendlyAuthError } from '@/lib/auth/auth-messages';
import { Button, Card, Label, Notice, field } from './ui';
import { DISPLAY } from '@/components/vibers/vibers-fonts';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

/** Sign in or create the one Vibers account (the same login as Quad Computing hosts and guests). */
export function AuthPanel({ onDone, intro }: { onDone: () => void; intro?: string }) {
  const [mode, setMode] = useState<'signin' | 'create'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const score = strength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!EMAIL.test(email.trim())) return setError('Enter a valid email address.');
    if (mode === 'create' && score < 2) return setError('Choose a stronger password: 8+ characters with a mix of letters and numbers.');
    setBusy(true);
    const auth = createClient().auth;
    const res = mode === 'signin'
      ? await auth.signInWithPassword({ email: email.trim(), password })
      : await auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (res.error) return setError(friendlyAuthError(res.error.message));
    if (!res.data.session) return setSent(true);
    onDone();
  };

  if (sent) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <MailCheck aria-hidden="true" className="mx-auto h-8 w-8 text-emerald-600" />
        <p className={`${DISPLAY} mt-3 text-2xl`}>Check your email</p>
        <p className="mt-2 text-sm text-[#2a1250]/60">Open the link we sent to {email}, then come back and sign in.</p>
        <Button tone="quiet" className="mt-5" onClick={() => { setSent(false); setMode('signin'); }}>I have confirmed it</Button>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md">
      <p className={`${DISPLAY} text-2xl`}>{mode === 'signin' ? 'Sign in' : 'Create your Vibers account'}</p>
      <p className="mt-1 text-sm text-[#2a1250]/60">{intro || 'One account for Vibers Club, every Vibers property and Quad Computing.'}</p>
      <div role="tablist" className="mt-4 flex gap-1 rounded-full bg-[#2a1250]/[0.05] p-1">
        {(['signin', 'create'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(''); }}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${mode === m ? 'bg-white text-[#2a1250] shadow-sm' : 'text-[#2a1250]/55'}`}>
            {m === 'signin' ? 'I have an account' : 'New here'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <Label text="Email"><input className={field} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Label>
        <Label text="Password">
          <span className="relative block">
            <input className={`${field} pr-11`} type={show ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[#2a1250]/45 hover:text-[#2a1250]">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </Label>
        {mode === 'create' && password && (
          <div aria-live="polite">
            <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? (score >= 3 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-[#2a1250]/10'}`} />)}</div>
            <p className="mt-1 text-[11px] text-[#2a1250]/55">Password strength: {STRENGTH[score]}</p>
          </div>
        )}
        <Notice>{error}</Notice>
        <Button type="submit" busy={busy} className="w-full">{mode === 'signin' ? 'Sign in' : 'Create account'}</Button>
      </form>
    </Card>
  );
}
