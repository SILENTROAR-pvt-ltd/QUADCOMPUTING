'use client';

import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { input } from '@/components/host/workspaces/profile/ProfileFields';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** A password field with a show/hide toggle and a Caps Lock warning. Works with react-hook-form's register. */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput({ className = '', onKeyUp, ...rest }, ref) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  return (
    <span className="block">
      <span className="relative block">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={`${input} pr-11 ${className}`}
          onKeyUp={(e) => { setCapsLock(e.getModifierState?.('CapsLock') ?? false); onKeyUp?.(e); }}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-neutral-500 hover:text-neutral-900 cursor-pointer"
        >
          {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </span>
      {capsLock && <span className="mt-1 block text-xs text-amber-700">Caps Lock is on.</span>}
    </span>
  );
});
