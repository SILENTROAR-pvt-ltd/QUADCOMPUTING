'use client';

import React, { useState } from 'react';
import { AtSign, Phone, User } from 'lucide-react';
import { applyGuestIdentity, createVibersProfile, type GuestAccountSummary } from '@/lib/guest/guest-account-client';
import type { TravellerTypeId } from '@/lib/guest/traveller-types';
import { TravellerFields } from './TravellerFields';
import { FormError, IconInput, QuietButton, SecretInput, SubmitButton } from './AuthFields';

interface Props {
  venueId: string;
  onSignedIn: (account: GuestAccountSummary) => void;
  onSwitchAccount: () => void;
}

const cleanHandle = (v: string) => v.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);

/**
 * The Vibers profile, made once per person: one @handle, name and phone used at every property. A
 * guest who had an @handle + PIN account enters that PIN once, so their wallets come with them.
 */
export function VibersProfileForm({ venueId, onSignedIn, onSwitchAccount }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [handle, setHandle] = useState('');
  const [travellerType, setTravellerType] = useState<TravellerTypeId | null>(null);
  const [intro, setIntro] = useState('');
  const [legacyPin, setLegacyPin] = useState('');
  const [askPin, setAskPin] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter your name.');
    if (phone.replace(/\D/g, '').length < 8) return setError('Enter a valid mobile number.');
    if (cleanHandle(handle).length < 2) return setError('Choose a handle of at least 2 characters.');
    if (askPin && legacyPin.length !== 6) return setError('Your old PIN is 6 digits.');

    setBusy(true);
    const outcome = await createVibersProfile(venueId, {
      name: name.trim(), phone, handle: cleanHandle(handle), traveller_type: travellerType, intro,
      legacy_pin: askPin ? legacyPin : undefined,
    });
    setBusy(false);
    if (!outcome.ok) {
      if (outcome.code === 'legacy_pin_required') setAskPin(true);
      setLegacyPin('');
      return setError(outcome.error);
    }
    applyGuestIdentity(outcome.account);
    onSignedIn(outcome.account);
  };

  return (
    <form onSubmit={submit} className="space-y-3.5 pt-5" noValidate>
      <IconInput label="Name" icon={User} type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      <IconInput label="Mobile number" icon={Phone} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" />
      <IconInput
        label="Handle" hint="how others see you, at every property" icon={AtSign} type="text" autoCapitalize="none" autoCorrect="off"
        value={handle} onChange={(e) => setHandle(cleanHandle(e.target.value))} placeholder="yourname"
      />
      <TravellerFields travellerType={travellerType} onTravellerType={setTravellerType} intro={intro} onIntro={setIntro} />

      {askPin ? (
        <SecretInput
          label="Your old 6-digit PIN for this handle" inputMode="numeric" autoComplete="off" maxLength={6}
          value={legacyPin} onChange={(e) => setLegacyPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits"
        />
      ) : (
        <button type="button" onClick={() => setAskPin(true)} className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-950 cursor-pointer">
          Used a handle and PIN here before? Bring your wallet
        </button>
      )}

      <FormError message={error} />
      <SubmitButton busy={busy}>Finish profile</SubmitButton>
      <QuietButton onClick={onSwitchAccount}>Use a different account</QuietButton>
    </form>
  );
}

export default VibersProfileForm;
