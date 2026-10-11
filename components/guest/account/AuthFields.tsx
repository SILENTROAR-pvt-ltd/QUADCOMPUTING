'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, type LucideIcon } from 'lucide-react';

export const authField =
  'w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white transition-all';

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>;

/** A labelled input with a leading icon, in the guest sheet's style. */
export function IconInput({ label, hint, icon: Icon, ...rest }: InputProps & { label: string; hint?: string; icon: LucideIcon }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-zinc-600">
        {label} {hint && <span className="text-zinc-400 font-normal">· {hint}</span>}
      </span>
      <span className="relative mt-1 block">
        <Icon aria-hidden="true" className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input className={authField} {...rest} />
      </span>
    </label>
  );
}

/** A password field with a show/hide toggle and a Caps Lock warning. */
export function SecretInput({ label, onKeyUp, ...rest }: Omit<InputProps, 'type'> & { label: string }) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-zinc-600">{label}</span>
      <span className="relative mt-1 block">
        <KeyRound aria-hidden="true" className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type={visible ? 'text' : 'password'}
          className={`${authField} pr-11`}
          onKeyUp={(e) => { setCapsLock(e.getModifierState?.('CapsLock') ?? false); onKeyUp?.(e); }}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide' : 'Show'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-zinc-400 hover:text-zinc-900 cursor-pointer"
        >
          {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </span>
      {capsLock && <span className="mt-1 block text-[11px] text-amber-700">Caps Lock is on.</span>}
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  return message ? <p role="alert" className="text-xs text-rose-600 font-medium">{message}</p> : null;
}

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={busy} className="w-full py-3 rounded-2xl bg-zinc-950 text-white font-semibold text-sm hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-lg shadow-zinc-950/10 cursor-pointer disabled:opacity-50 disabled:cursor-wait">
      {busy ? 'Please wait…' : children}
    </button>
  );
}

export function QuietButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="w-full py-2.5 rounded-2xl text-zinc-600 font-medium text-sm hover:text-zinc-950 hover:bg-zinc-50 transition-all cursor-pointer">
      {children}
    </button>
  );
}
