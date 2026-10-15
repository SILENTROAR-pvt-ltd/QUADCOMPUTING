'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AtSign, Phone, User } from 'lucide-react';
import { applyGuestIdentity, checkHandle, createVibersProfile, type GuestAccountSummary, type HandleStatus } from '@/lib/guest/guest-account-client';
import { createClient } from '@/lib/supabase/client';
import { suggestHandle } from '@/lib/auth/safe-next';
import { isWeakPin, WEAK_PIN_MESSAGE } from '@/lib/auth/pin-strength';
import type { TravellerTypeId } from '@/lib/guest/traveller-types';
import { TravellerFields } from './TravellerFields';
import { FormError, IconInput, QuietButton, SecretInput, SubmitButton, authField } from './AuthFields';

interface Props {
  venueId: string;
  onSignedIn: (account: GuestAccountSummary) => void;
  onSwitchAccount: () => void;
}

const cleanHandle = (v: string) => v.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);

const COUNTRY_CODES = [
  { code: '91', label: '+91 India' }, { code: '1', label: '+1 US / Canada' }, { code: '44', label: '+44 UK' },
  { code: '971', label: '+971 UAE' }, { code: '65', label: '+65 Singapore' }, { code: '61', label: '+61 Australia' },
  { code: '977', label: '+977 Nepal' }, { code: '94', label: '+94 Sri Lanka' }, { code: '880', label: '+880 Bangladesh' },
];

/** What is sent to the server. India (the default) stays the plain 10-digit number accounts already use. */
export function fullPhone(code: string, typed: string): string {
  const digits = typed.replace(/\D/g, '');
  return code === '91' ? digits : `${code}${digits.replace(/^0+/, '')}`;
}

const HANDLE_NOTE: Record<HandleStatus, { text: string; tone: string } | null> = {
  available: { text: 'Available', tone: 'text-emerald-700' },
  taken: { text: 'Already taken, try another', tone: 'text-rose-600' },
  legacy: { text: 'This handle belongs to an earlier account. Choose another, or tap "This is my old handle" below if it is yours', tone: 'text-amber-700' },
  invalid: { text: 'Use 2 to 30 letters, numbers or underscores', tone: 'text-rose-600' },
  unknown: null,
};

/**
 * The Vibers profile, made once per person: one @handle, name and phone used at every property. A
 * guest who had an @handle + PIN account enters that PIN once, so their wallets come with them.
 * After Google sign-in the name and a handle are filled in for them to confirm.
 */
export function VibersProfileForm({ venueId, onSignedIn, onSwitchAccount }: Props) {
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [phone, setPhone] = useState('');
  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('unknown');
  const [travellerType, setTravellerType] = useState<TravellerTypeId | null>(null);
  const [intro, setIntro] = useState('');
  const [legacyPin, setLegacyPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [askPin, setAskPin] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const touched = useRef({ name: false, handle: false });
  const autoTries = useRef(0);
  const autoBase = useRef('');

  // Suggest a name and @handle from the signed-in account (Google name, or the start of the email). Never overwrites typing.
  useEffect(() => {
    let live = true;
    void createClient().auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!live || !user) return;
      const meta: any = user.user_metadata || {};
      const fullName = String(meta.full_name || meta.name || '').trim();
      if (fullName && !touched.current.name) setName(fullName);
      const suggestion = suggestHandle(fullName, user.email);
      if (suggestion && !touched.current.handle) { autoBase.current = suggestion; setHandle(suggestion); }
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  // Live availability, a moment after the person stops typing.
  useEffect(() => {
    const value = cleanHandle(handle);
    if (value.length < 2) { setHandleStatus(value.length === 0 ? 'unknown' : 'invalid'); return; }
    let live = true;
    const timer = setTimeout(() => {
      void checkHandle(value).then((status) => {
        if (!live) return;
        // A handle we suggested (the person has not typed one) that is not free: try the same name with digits, a few times.
        if ((status === 'taken' || status === 'legacy') && !touched.current.handle && autoTries.current < 4) {
          autoTries.current += 1;
          const base = (autoBase.current || value).slice(0, 26);
          setHandle(`${base}${Math.floor(10 + Math.random() * 990)}`);
          return;
        }
        setHandleStatus(status);
      });
    }, 400);
    return () => { live = false; clearTimeout(timer); };
  }, [handle]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter your name.');
    const sentPhone = fullPhone(countryCode, phone);
    if (sentPhone.length < 8 || sentPhone.length > 15) return setError('Enter a valid mobile number.');
    if (cleanHandle(handle).length < 2) return setError('Choose a handle of at least 2 characters.');
    if (handleStatus === 'taken') return setError('That handle is already taken. Please choose another.');
    if (handleStatus === 'legacy' && !askPin) return setError('That handle belongs to an earlier account. Choose another handle, or tap "This is my old handle" if it is yours.');
    if (askPin && legacyPin.length !== 6) return setError('Your old PIN is 6 digits.');
    // A new person chooses a PIN now, to sign in later with their @handle. Someone bringing an old account keeps their old PIN.
    if (!askPin) {
      if (!/^\d{6}$/.test(newPin)) return setError('Choose a 6-digit PIN.');
      if (isWeakPin(newPin)) return setError(WEAK_PIN_MESSAGE);
      if (newPin !== confirmPin) return setError('The two PINs do not match.');
    }

    setBusy(true);
    const outcome = await createVibersProfile(venueId, {
      name: name.trim(), phone: sentPhone, handle: cleanHandle(handle), traveller_type: travellerType, intro,
      legacy_pin: askPin ? legacyPin : undefined,
      new_pin: askPin ? undefined : newPin,
    });
    setBusy(false);
    if (!outcome.ok) {
      if (outcome.code === 'legacy_pin_required') setAskPin(true);
      if (outcome.code === 'handle_taken') setHandleStatus('taken');
      setLegacyPin('');
      setNewPin('');
      setConfirmPin('');
      return setError(outcome.error);
    }
    applyGuestIdentity(outcome.account);
    onSignedIn(outcome.account);
  };

  const note = HANDLE_NOTE[handleStatus];

  return (
    <form onSubmit={submit} className="space-y-3.5 pt-5" noValidate>
      <IconInput label="Name" icon={User} type="text" autoComplete="name" value={name} onChange={(e) => { touched.current.name = true; setName(e.target.value); }} placeholder="Your name" />

      <div>
        <span className="text-[11px] font-medium text-zinc-600">Mobile number</span>
        <div className="mt-1 flex gap-2">
          <select
            aria-label="Country code" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
            className="w-[6.2rem] shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 focus:bg-white cursor-pointer"
          >
            {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <span className="relative block flex-1">
            <Phone aria-hidden="true" className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              className={authField} type="tel" inputMode="tel" autoComplete="tel-national" value={phone}
              onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number"
            />
          </span>
        </div>
      </div>

      <div>
        <IconInput
          label="Handle" hint="how others see you, at every property" icon={AtSign} type="text" autoCapitalize="none" autoCorrect="off"
          value={handle} onChange={(e) => { touched.current.handle = true; setHandle(cleanHandle(e.target.value)); }} placeholder="yourname"
        />
        {note && <p role="status" className={`mt-1 text-[11px] font-medium ${note.tone}`}>{note.text}</p>}
      </div>

      <TravellerFields travellerType={travellerType} onTravellerType={setTravellerType} intro={intro} onIntro={setIntro} />

      {askPin ? (
        <>
          <SecretInput
            label="Your old 6-digit PIN for this handle" inputMode="numeric" autoComplete="off" maxLength={6}
            value={legacyPin} onChange={(e) => setLegacyPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits"
          />
          <button type="button" onClick={() => { setAskPin(false); setLegacyPin(''); }} className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-950 cursor-pointer">
            I am new here: choose a new PIN instead
          </button>
        </>
      ) : (
        <>
          <SecretInput
            label="Create a 6-digit PIN" inputMode="numeric" autoComplete="new-password" maxLength={6}
            value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits"
          />
          <SecretInput
            label="Confirm PIN" inputMode="numeric" autoComplete="new-password" maxLength={6}
            value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Type it again"
          />
          <p className="-mt-1 text-[11px] text-zinc-500">Sign in later with your @handle and this PIN, at any Vibers property.</p>
          {handleStatus === 'legacy' && (
            <button type="button" onClick={() => setAskPin(true)} className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-950 cursor-pointer">
              This is my old handle: bring my wallet
            </button>
          )}
        </>
      )}

      <FormError message={error} />
      <SubmitButton busy={busy}>Save &amp; continue</SubmitButton>
      <QuietButton onClick={onSwitchAccount}>Use a different account</QuietButton>
    </form>
  );
}

export default VibersProfileForm;
