'use client';

import React, { useEffect, useState } from 'react';
import { AtSign, KeyRound, Phone, User, X } from 'lucide-react';
import {
  applyGuestIdentity,
  fetchGuestAccountState,
  recoverGuestPin,
  signInGuest,
  signUpGuest,
  type GuestAccountSummary,
} from '@/lib/guest/guest-account-client';
import { GUEST_BRAND } from '@/lib/brand';
import type { TravellerTypeId } from '@/lib/guest/traveller-types';
import { TravellerFields } from '@/components/guest/account/TravellerFields';

type Mode = 'create' | 'signin' | 'recover';

export interface GuestAuthSheetProps {
  isOpen: boolean;
  venueId: string;
  tableNumber: string;
  initialMode?: Mode;
  onClose: () => void;
  onSignedIn: (account: GuestAccountSummary) => void;
  /** When provided, guests may continue without an account (no cashback). */
  onBrowse?: () => void;
}

const field =
  'w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white transition-all';

function PinInput({ value, onChange, label, autoComplete }: { value: string; onChange: (v: string) => void; label: string; autoComplete: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-zinc-600">{label}</span>
      <div className="relative mt-1">
        <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="password"
          inputMode="numeric"
          autoComplete={autoComplete}
          maxLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6 digits"
          className={`${field} tracking-[0.4em]`}
        />
      </div>
    </label>
  );
}

/**
 * Sign-up / sign-in sheet for guests. Identity is a handle plus a 6-digit PIN,
 * checked by the server; the browser only keeps what the server confirms.
 */
export function GuestAuthSheet({ isOpen, venueId, tableNumber, initialMode = 'create', onClose, onSignedIn, onBrowse }: GuestAuthSheetProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [handle, setHandle] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [travellerType, setTravellerType] = useState<TravellerTypeId | null>(null);
  const [intro, setIntro] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) { setMode(initialMode); setError(''); }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const cleanHandle = (v: string) => v.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'recover') {
      if (cleanHandle(handle).length < 2) return setError('Enter the handle you signed up with.');
      if (phone.replace(/\D/g, '').length < 8) return setError('Enter the mobile number on your account.');
      if (pin.length !== 6) return setError('Your new PIN is 6 digits.');
      if (pin !== confirm) return setError('The two PINs do not match.');
      setBusy(true);
      const result = await recoverGuestPin(venueId, { handle: cleanHandle(handle), phone, newPin: pin });
      if (!result.ok) {
        setBusy(false);
        setPin('');
        setConfirm('');
        return setError(result.error);
      }
      // Signed in on this device now: load the account the server confirms and keep it.
      const state = await fetchGuestAccountState(venueId);
      setBusy(false);
      if (state.status !== 'in') return setError('Your PIN was reset. Sign in with your new PIN.');
      applyGuestIdentity(state.account);
      onSignedIn(state.account);
      return;
    }

    if (pin.length !== 6) return setError('Your PIN is 6 digits.');
    if (mode === 'create') {
      if (!name.trim()) return setError('Enter your name.');
      if (phone.replace(/\D/g, '').length < 8) return setError('Enter a valid mobile number.');
      if (cleanHandle(handle).length < 2) return setError('Choose a handle of at least 2 characters.');
      if (pin !== confirm) return setError('The two PINs do not match.');
    }

    setBusy(true);
    const outcome = mode === 'create'
      ? await signUpGuest(venueId, {
          name: name.trim(),
          phone,
          handle: cleanHandle(handle),
          pin,
          avatar: '☕',
          traveller_type: travellerType,
          intro,
        })
      : await signInGuest(venueId, cleanHandle(handle), pin);
    setBusy(false);

    if (!outcome.ok) {
      setPin('');
      setConfirm('');
      return setError(outcome.error);
    }
    applyGuestIdentity(outcome.account);
    onSignedIn(outcome.account);
  };

  const tabClass = (active: boolean) =>
    `flex-1 rounded-xl py-2 text-xs font-semibold transition-colors cursor-pointer ${active ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="guest-auth-title" className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl border border-zinc-200/80 p-6 shadow-2xl" style={{ maxHeight: '92dvh', overflowY: 'auto' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="guest-auth-title" className="font-serif text-xl text-zinc-950 leading-tight">
              {mode === 'create' ? 'Create your guest account' : mode === 'recover' ? 'Reset your PIN' : 'Sign in'}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {mode === 'create'
                ? `Earn 7% back on your bills at this venue. Works on any phone at Table ${tableNumber}.`
                : mode === 'recover'
                  ? 'Use the mobile number on your account, on the phone you signed up on.'
                  : 'Use the handle and PIN you chose when you signed up.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 -mr-1 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-black cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode !== 'recover' && (
          <div role="tablist" className="mt-4 flex gap-1 rounded-2xl bg-zinc-100 p-1">
            <button type="button" role="tab" aria-selected={mode === 'create'} className={tabClass(mode === 'create')} onClick={() => { setMode('create'); setError(''); }}>New guest</button>
            <button type="button" role="tab" aria-selected={mode === 'signin'} className={tabClass(mode === 'signin')} onClick={() => { setMode('signin'); setError(''); }}>I have an account</button>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3.5 pt-5" noValidate>
          {mode === 'create' && (
            <>
              <label className="block">
                <span className="text-[11px] font-medium text-zinc-600">Name</span>
                <div className="relative mt-1">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
                </div>
              </label>
            </>
          )}

          {(mode === 'create' || mode === 'recover') && (
            <label className="block">
              <span className="text-[11px] font-medium text-zinc-600">Mobile number</span>
              <div className="relative mt-1">
                <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" className={field} />
              </div>
            </label>
          )}

          {mode === 'create' && (
            <TravellerFields
              travellerType={travellerType}
              onTravellerType={setTravellerType}
              intro={intro}
              onIntro={setIntro}
            />
          )}

          <label className="block">
            <span className="text-[11px] font-medium text-zinc-600">Handle <span className="text-zinc-400 font-normal">· how others see you</span></span>
            <div className="relative mt-1">
              <AtSign className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="text" autoCapitalize="none" autoCorrect="off" autoComplete="username" value={handle} onChange={(e) => setHandle(cleanHandle(e.target.value))} placeholder="yourname" className={field} />
            </div>
          </label>

          <PinInput
            label={mode === 'create' ? 'Choose a 6-digit PIN' : mode === 'recover' ? 'New 6-digit PIN' : 'PIN'}
            value={pin}
            onChange={setPin}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          {(mode === 'create' || mode === 'recover') && (
            <PinInput label="Confirm PIN" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          )}

          {mode === 'signin' && (
            <div className="text-right">
              <button type="button" onClick={() => { setMode('recover'); setError(''); setPin(''); setConfirm(''); }} className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-950 cursor-pointer">
                Forgot PIN?
              </button>
            </div>
          )}

          {error && <p role="alert" className="text-xs text-rose-600 font-medium">{error}</p>}

          <button type="submit" disabled={busy} className="w-full py-3 rounded-2xl bg-zinc-950 text-white font-semibold text-sm hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-lg shadow-zinc-950/10 cursor-pointer disabled:opacity-50 disabled:cursor-wait">
            {busy ? 'Please wait…' : mode === 'create' ? 'Create account' : mode === 'recover' ? 'Set new PIN' : 'Sign in'}
          </button>

          {mode === 'recover' && (
            <button type="button" onClick={() => { setMode('signin'); setError(''); setPin(''); setConfirm(''); }} className="w-full py-2.5 rounded-2xl text-zinc-600 font-medium text-sm hover:text-zinc-950 hover:bg-zinc-50 transition-all cursor-pointer">
              Back to sign in
            </button>
          )}

          {onBrowse && (
            <button type="button" onClick={onBrowse} className="w-full py-2.5 rounded-2xl text-zinc-600 font-medium text-sm hover:text-zinc-950 hover:bg-zinc-50 transition-all cursor-pointer">
              Continue without an account
            </button>
          )}
          <p className="text-[10.5px] text-zinc-400 text-center leading-relaxed">
            Your PIN is stored only as a secure hash. Keep it private. {GUEST_BRAND.name} never asks for it by message.
          </p>
        </form>
      </div>
    </div>
  );
}

export default GuestAuthSheet;
