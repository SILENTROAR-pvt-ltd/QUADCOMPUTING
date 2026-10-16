'use client';

import React, { useState } from 'react';
import { AtSign, User } from 'lucide-react';
import { applyGuestIdentity, createVibersProfile, type GuestAccountSummary, type HandleStatus } from '@/lib/guest/guest-account-client';
import { isWeakPin, WEAK_PIN_MESSAGE } from '@/lib/auth/pin-strength';
import type { TravellerTypeId } from '@/lib/guest/traveller-types';
import { TravellerFields } from './TravellerFields';
import { FormError, IconInput, QuietButton, SubmitButton } from './AuthFields';
import { PhoneField, fullPhone } from './profile-form/PhoneField';
import { PinFields } from './profile-form/PinFields';
import { cleanHandle, useHandleSuggestion } from './profile-form/useHandleSuggestion';

export { fullPhone } from './profile-form/PhoneField';

interface Props {
  venueId: string;
  onSignedIn: (account: GuestAccountSummary) => void;
  onSwitchAccount: () => void;
}

const HANDLE_NOTE: Record<HandleStatus, { text: string; tone: string } | null> = {
  available: { text: 'Available', tone: 'text-emerald-700' },
  taken: { text: 'Already taken, try another', tone: 'text-rose-600' },
  legacy: { text: 'This handle belongs to an earlier account. Choose another, or tap "This is my old handle" below if it is yours', tone: 'text-amber-700' },
  invalid: { text: 'Use 2 to 30 letters, numbers or underscores', tone: 'text-rose-600' },
  unknown: null,
};

/**
 * The Vibers profile, made once per person: one @handle, name and phone used at every property. A guest who had an
 * @handle + PIN account enters that PIN once, so their wallets come with them. After Google sign-in the name and a
 * handle are filled in for them to confirm.
 */
export function VibersProfileForm({ venueId, onSignedIn, onSwitchAccount }: Props) {
  const who = useHandleSuggestion();
  const [countryCode, setCountryCode] = useState('91');
  const [phone, setPhone] = useState('');
  const [travellerType, setTravellerType] = useState<TravellerTypeId | null>(null);
  const [intro, setIntro] = useState('');
  const [legacyPin, setLegacyPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [askOld, setAskOld] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!who.name.trim()) return setError('Enter your name.');
    const sentPhone = fullPhone(countryCode, phone);
    if (sentPhone.length < 8 || sentPhone.length > 15) return setError('Enter a valid mobile number.');
    if (cleanHandle(who.handle).length < 2) return setError('Choose a handle of at least 2 characters.');
    if (who.status === 'taken') return setError('That handle is already taken. Please choose another.');
    if (who.status === 'legacy' && !askOld) return setError('That handle belongs to an earlier account. Choose another handle, or tap "This is my old handle" if it is yours.');
    if (askOld && legacyPin.length !== 6) return setError('Your old PIN is 6 digits.');
    // A new person chooses a PIN now, to sign in later with their @handle. Someone bringing an old account keeps their old PIN.
    if (!askOld) {
      if (!/^\d{6}$/.test(newPin)) return setError('Choose a 6-digit PIN.');
      if (isWeakPin(newPin)) return setError(WEAK_PIN_MESSAGE);
      if (newPin !== confirmPin) return setError('The two PINs do not match.');
    }

    setBusy(true);
    const outcome = await createVibersProfile(venueId, {
      name: who.name.trim(), phone: sentPhone, handle: cleanHandle(who.handle), traveller_type: travellerType, intro,
      legacy_pin: askOld ? legacyPin : undefined,
      new_pin: askOld ? undefined : newPin,
    });
    setBusy(false);
    if (!outcome.ok) {
      if (outcome.code === 'legacy_pin_required') setAskOld(true);
      if (outcome.code === 'handle_taken') who.setStatus('taken');
      setLegacyPin(''); setNewPin(''); setConfirmPin('');
      return setError(outcome.error);
    }
    applyGuestIdentity(outcome.account);
    onSignedIn(outcome.account);
  };

  const note = HANDLE_NOTE[who.status];

  return (
    <form onSubmit={submit} className="space-y-3.5 pt-5" noValidate>
      <IconInput label="Name" icon={User} type="text" autoComplete="name" value={who.name} onChange={(e) => who.typeName(e.target.value)} placeholder="Your name" />
      <PhoneField code={countryCode} onCode={setCountryCode} value={phone} onChange={setPhone} />
      <div>
        <IconInput label="Handle" hint="how others see you, at every property" icon={AtSign} type="text" autoCapitalize="none" autoCorrect="off"
          value={who.handle} onChange={(e) => who.typeHandle(e.target.value)} placeholder="yourname" />
        {note && <p role="status" className={`mt-1 text-[11px] font-medium ${note.tone}`}>{note.text}</p>}
      </div>
      <TravellerFields travellerType={travellerType} onTravellerType={setTravellerType} intro={intro} onIntro={setIntro} />
      <PinFields askOld={askOld} onAskOld={setAskOld} legacyPin={legacyPin} onLegacyPin={setLegacyPin} newPin={newPin} onNewPin={setNewPin}
        confirmPin={confirmPin} onConfirmPin={setConfirmPin} handleStatus={who.status} />
      <FormError message={error} />
      <SubmitButton busy={busy}>Save &amp; continue</SubmitButton>
      <QuietButton onClick={onSwitchAccount}>Use a different account</QuietButton>
    </form>
  );
}

export default VibersProfileForm;
