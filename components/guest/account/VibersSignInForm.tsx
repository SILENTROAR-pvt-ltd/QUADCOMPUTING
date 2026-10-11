'use client';

import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { connectAfterSignIn, signInVibers, signUpVibers, type GuestAccountSummary } from '@/lib/guest/guest-account-client';
import { FormError, IconInput, SecretInput, SubmitButton } from './AuthFields';

export type CredentialMode = 'create' | 'signin';

interface Props {
  venueId: string;
  mode: CredentialMode;
  onMode: (mode: CredentialMode) => void;
  onSignedIn: (account: GuestAccountSummary) => void;
  onNeedsProfile: () => void;
  onCheckEmail: (email: string) => void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email + password for the Vibers account: the same login hosts use for Quad Computing. */
export function VibersSignInForm({ venueId, mode, onMode, onSignedIn, onNeedsProfile, onCheckEmail }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!EMAIL.test(email.trim())) return setError('Enter a valid email address.');
    if (mode === 'create') {
      if (password.length < 8) return setError('Choose a password of at least 8 characters.');
      if (password !== confirm) return setError('The two passwords do not match.');
    } else if (!password) {
      return setError('Enter your password.');
    }

    setBusy(true);
    try {
      if (mode === 'create') {
        const made = await signUpVibers(email, password);
        if (!made.ok) {
          if (made.exists) onMode('signin');
          return setError(made.error);
        }
        if (!made.confirmed) return onCheckEmail(email.trim());
      } else {
        const signed = await signInVibers(email, password);
        if (!signed.ok) return setError(signed.error);
      }
      const next = await connectAfterSignIn(venueId);
      if (next.kind === 'in') return onSignedIn(next.account);
      if (next.kind === 'profile') return onNeedsProfile();
      setError(next.error);
    } finally {
      setBusy(false);
      setPassword('');
      setConfirm('');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3.5 pt-5" noValidate>
      <IconInput
        label="Email" icon={Mail} type="email" inputMode="email" autoComplete="email" autoCapitalize="none"
        value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
      />
      <SecretInput
        label={mode === 'create' ? 'Choose a password' : 'Password'}
        autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
        value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === 'create' ? 'At least 8 characters' : 'Your password'}
      />
      {mode === 'create' && (
        <SecretInput label="Confirm password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type it again" />
      )}
      <FormError message={error} />
      <SubmitButton busy={busy}>{mode === 'create' ? 'Create account' : 'Sign in'}</SubmitButton>
    </form>
  );
}

export default VibersSignInForm;
