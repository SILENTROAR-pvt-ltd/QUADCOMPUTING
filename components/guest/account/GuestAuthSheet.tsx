'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MailCheck, X } from 'lucide-react';
import { applyGuestIdentity, fetchGuestAccountState, GOOGLE_AUTH_ENABLED, type GuestAccountSummary } from '@/lib/guest/guest-account-client';
import { createClient } from '@/lib/supabase/client';
import { GUEST_BRAND } from '@/lib/brand';
import { FormError, QuietButton } from './AuthFields';
import { VibersSignInForm, type CredentialMode } from './VibersSignInForm';
import { VibersProfileForm } from './VibersProfileForm';
import { VibersPinSignInForm } from './VibersPinSignInForm';
import { GoogleAuthButton } from './GoogleAuthButton';
import { AuthModeTabs } from './auth/AuthModeTabs';
import { AUTH_COPY, type AuthStep } from './auth/auth-copy';

export interface GuestAuthSheetProps {
  isOpen: boolean;
  venueId: string;
  tableNumber: string;
  initialMode?: CredentialMode;
  onClose: () => void;
  onSignedIn: (account: GuestAccountSummary) => void;
  /** When provided, guests may continue without an account (no cashback). */
  onBrowse?: () => void;
  /** A message shown above the form, e.g. when Google sign-in did not complete. */
  notice?: string;
}

/** Guest sign-in: one Vibers account (the same Supabase login as QC), then a one-time profile. */
export function GuestAuthSheet({ isOpen, venueId, tableNumber, initialMode = 'create', onClose, onSignedIn, onBrowse, notice }: GuestAuthSheetProps) {
  const [step, setStep] = useState<AuthStep>(initialMode);
  const [sentTo, setSentTo] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep(initialMode);
    // Already signed in to a Vibers account on this browser (a host, or someone mid-sign-up): straight to the profile, or in.
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
  const [title, subtitle] = AUTH_COPY[step];

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="guest-auth-title" className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <motion.div initial={{ y: 48, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 38 }}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[32px] border border-zinc-200/80 bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="guest-auth-title" className="font-serif text-xl leading-tight text-zinc-950">{title}</h2>
            <p className="mt-1 text-xs text-zinc-500">{subtitle(tableNumber)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 grid h-10 w-10 cursor-pointer place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-black"><X className="h-5 w-5" /></button>
        </div>

        {(step === 'create' || step === 'signin' || step === 'pin') && (
          <>
            {notice && <div className="pt-3"><FormError message={notice} /></div>}
            {GOOGLE_AUTH_ENABLED && <GoogleAuthButton />}
            <AuthModeTabs step={step} onStep={setStep} />
            {step === 'pin' ? (
              <>
                <VibersPinSignInForm venueId={venueId} onSignedIn={onSignedIn} />
                <div className="mt-1"><QuietButton onClick={() => setStep('signin')}>Use email and password instead</QuietButton></div>
              </>
            ) : (
              <>
                <VibersSignInForm key={step} venueId={venueId} mode={step} onMode={setStep} onSignedIn={onSignedIn}
                  onNeedsProfile={() => setStep('profile')} onCheckEmail={(email) => { setSentTo(email); setStep('check_email'); }} />
                {step === 'signin' && <div className="mt-1"><QuietButton onClick={() => setStep('pin')}>Use @handle and PIN instead</QuietButton></div>}
              </>
            )}
          </>
        )}

        {step === 'profile' && <VibersProfileForm venueId={venueId} onSignedIn={onSignedIn} onSwitchAccount={switchAccount} />}

        {step === 'check_email' && (
          <div className="space-y-3.5 pt-5">
            <p className="flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900">
              <MailCheck aria-hidden="true" className="h-4 w-4 shrink-0" /> Sent to {sentTo}
            </p>
            <QuietButton onClick={() => setStep('signin')}>I have confirmed it, sign in</QuietButton>
          </div>
        )}

        {onBrowse && step !== 'profile' && <div className="mt-1"><QuietButton onClick={onBrowse}>Continue without an account</QuietButton></div>}
        <p className="mt-2 text-center text-[10.5px] leading-relaxed text-zinc-400">Your password is never stored by the venue. {GUEST_BRAND.name} never asks for it by message.</p>
      </motion.div>
    </div>
  );
}

export default GuestAuthSheet;
