'use client';

import React from 'react';
import type { HandleStatus } from '@/lib/guest/guest-account-client';
import { SecretInput } from '../AuthFields';

const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6);
const LINK = 'cursor-pointer text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-950';

interface PinFieldsProps {
  /** The handle belongs to an earlier account: its old PIN is asked for, instead of a new one. */
  askOld: boolean;
  onAskOld: (v: boolean) => void;
  legacyPin: string;
  onLegacyPin: (v: string) => void;
  newPin: string;
  onNewPin: (v: string) => void;
  confirmPin: string;
  onConfirmPin: (v: string) => void;
  handleStatus: HandleStatus;
}

/** Either the old PIN of a handle being brought over, or a new 6-digit PIN with its confirmation. */
export function PinFields(p: PinFieldsProps) {
  if (p.askOld) {
    return (
      <>
        <SecretInput label="Your old 6-digit PIN for this handle" inputMode="numeric" autoComplete="off" maxLength={6}
          value={p.legacyPin} onChange={(e) => p.onLegacyPin(digits(e.target.value))} placeholder="6 digits" />
        <button type="button" onClick={() => { p.onAskOld(false); p.onLegacyPin(''); }} className={LINK}>I am new here: choose a new PIN instead</button>
      </>
    );
  }
  return (
    <>
      <SecretInput label="Create a 6-digit PIN" inputMode="numeric" autoComplete="new-password" maxLength={6}
        value={p.newPin} onChange={(e) => p.onNewPin(digits(e.target.value))} placeholder="6 digits" />
      <SecretInput label="Confirm PIN" inputMode="numeric" autoComplete="new-password" maxLength={6}
        value={p.confirmPin} onChange={(e) => p.onConfirmPin(digits(e.target.value))} placeholder="Type it again" />
      <p className="-mt-1 text-[11px] text-zinc-500">Sign in later with your @handle and this PIN, at any Vibers property.</p>
      {p.handleStatus === 'legacy' && <button type="button" onClick={() => p.onAskOld(true)} className={LINK}>This is my old handle: bring my wallet</button>}
    </>
  );
}
