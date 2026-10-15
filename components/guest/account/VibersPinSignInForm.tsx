'use client';

import React, { useState } from 'react';
import { AtSign } from 'lucide-react';
import { signInWithPin, type GuestAccountSummary } from '@/lib/guest/guest-account-client';
import { FormError, IconInput, SecretInput, SubmitButton } from './AuthFields';

interface Props {
  venueId: string;
  onSignedIn: (account: GuestAccountSummary) => void;
}

const cleanHandle = (v: string) => v.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);

/** Sign in with the @handle and 6-digit PIN chosen when the Vibers profile was made. */
export function VibersPinSignInForm({ venueId, onSignedIn }: Props) {
  const [handle, setHandle] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (cleanHandle(handle).length < 2) return setError('Enter your @handle.');
    if (pin.length !== 6) return setError('Your PIN is 6 digits.');
    setBusy(true);
    const outcome = await signInWithPin(venueId, cleanHandle(handle), pin);
    setBusy(false);
    setPin('');
    if (!outcome.ok) return setError(outcome.error);
    onSignedIn(outcome.account);
  };

  return (
    <form onSubmit={submit} className="space-y-3.5 pt-5" noValidate>
      <IconInput
        label="Vibers handle" icon={AtSign} type="text" autoCapitalize="none" autoCorrect="off" autoComplete="username"
        value={handle} onChange={(e) => setHandle(cleanHandle(e.target.value))} placeholder="yourname"
      />
      <SecretInput
        label="6-digit PIN" inputMode="numeric" autoComplete="current-password" maxLength={6}
        value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits"
      />
      <FormError message={error} />
      <SubmitButton busy={busy}>Sign in</SubmitButton>
    </form>
  );
}

export default VibersPinSignInForm;
