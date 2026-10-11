'use client';

import React, { useEffect, useState } from 'react';
import { MailCheck, X } from 'lucide-react';
import { applyGuestIdentity, fetchGuestAccountState, type GuestAccountSummary } from '@/lib/guest/guest-account-client';
import { createClient } from '@/lib/supabase/client';
import { GUEST_BRAND } from '@/lib/brand';
import { QuietButton } from './AuthFields';
import { VibersSignInForm, type CredentialMode } from './VibersSignInForm';
import { VibersProfileForm } from './VibersProfileForm';

type Step = CredentialMode | 'profile' | 'check_email';

export interface GuestAuthSheetProps {
  isOpen: boolean;
  venueId: string;
  tableNumber: string;
  initialMode?: CredentialMode;
  onClose: () => void;
  onSignedIn: (account: GuestAccountSummary) => void;
  /** When provided, guests may continue without an account (no cashback). */
  onBrowse?: () => void;
}

const COPY: Record<Step, [string, (table: string) => string]> = {
  create: ['Create your Vibers account', (t) => `One account for every Vibers property. Earn 7% back on your bills, on any phone at Table ${t}.`],
  signin: ['Sign in', () => 'Use your Vibers account email and password. Hosts: it is the same login as Quad Computing.'],
  profile: ['Finish your profile', () => 'Once, for every property: your name, mobile and @handle.'],
  check_email: ['Check your email', () => 'Open the link we sent to confirm your account, then sign in here.'],
};

/** Guest sign-in: one Vibers account (the same Supabase login as QC), then a one-time profile. */
export function GuestAuthSheet({ isOpen, venueId, tableNumber, initialMode = 'create', onClose, onSignedIn, onBrowse }: GuestAuthSheetProps) {
  const [step, setStep] = useState<Step>(initialMode);
  const [sentTo, setSentTo] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep(initialMode);
    // Already signed in to a Vibers account on this browser (a host, or someone mid-sign-up): go
    // straight to the profile, or straight in.
    let live = true;
    void fetchGuestAccountState(venueId).then((state) => {
      if (!live) return;
      if (state.status === 'needs_profile') setStep('profile');
      if (state.status === 'in') { applyGuestIdentity(state.account); onSignedIn(state.account); }
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMode, venueId]);

  if (!isOpen) return null;

  const switchAccount = async () => {
    await createClient().auth.signOut({ scope: 'local' }).catch(() => {});
    setStep('signin');
  };
  const tabClass = (active: boolean) =>
    `flex-1 rounded-xl py-2 text-xs font-semibold transition-colors cursor-pointer ${active ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`;
  const [title, subtitle] = COPY[step];

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="guest-auth-title" className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl border border-zinc-200/80 p-6 shadow-2xl" style={{ maxHeight: '92dvh', overflowY: 'auto' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="guest-auth-title" className="font-serif text-xl text-zinc-950 leading-tight">{title}</h2>
            <p className="text-xs text-zinc-500 mt-1">{subtitle(tableNumber)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 -mr-1 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-black cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {(step === 'create' || step === 'signin') && (
          <>
            <div role="tablist" className="mt-4 flex gap-1 rounded-2xl bg-zinc-100 p-1">
              <button type="button" role="tab" aria-selected={step === 'create'} className={tabClass(step === 'create')} onClick={() => setStep('create')}>New here</button>
              <button type="button" role="tab" aria-selected={step === 'signin'} className={tabClass(step === 'signin')} onClick={() => setStep('signin')}>I have an account</button>
            </div>
            <VibersSignInForm
              key={step} venueId={venueId} mode={step} onMode={setStep} onSignedIn={onSignedIn}
              onNeedsProfile={() => setStep('profile')} onCheckEmail={(email) => { setSentTo(email); setStep('check_email'); }}
            />
          </>
        )}

        {step === 'profile' && <VibersProfileForm venueId={venueId} onSignedIn={onSignedIn} onSwitchAccount={switchAccount} />}

        {step === 'check_email' && (
          <div className="pt-5 space-y-3.5">
            <p className="flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900">
              <MailCheck aria-hidden="true" className="h-4 w-4 shrink-0" /> Sent to {sentTo}
            </p>
            <QuietButton onClick={() => setStep('signin')}>I have confirmed it, sign in</QuietButton>
          </div>
        )}

        {onBrowse && step !== 'profile' && <div className="mt-1"><QuietButton onClick={onBrowse}>Continue without an account</QuietButton></div>}
        <p className="mt-2 text-[10.5px] text-zinc-400 text-center leading-relaxed">
          Your password is never stored by the venue. {GUEST_BRAND.name} never asks for it by message.
        </p>
      </div>
    </div>
  );
}

export default GuestAuthSheet;
