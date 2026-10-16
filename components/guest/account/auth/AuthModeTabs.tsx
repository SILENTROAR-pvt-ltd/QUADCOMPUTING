'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { AuthStep } from './auth-copy';

/** "New here" / "I have an account": a switch whose pill glides between the two. */
export function AuthModeTabs({ step, onStep }: { step: AuthStep; onStep: (s: AuthStep) => void }) {
  const existing = step === 'signin' || step === 'pin';
  const tab = (active: boolean) => `relative flex-1 cursor-pointer rounded-xl py-2.5 text-xs font-semibold transition-colors ${active ? 'text-zinc-950' : 'text-zinc-500 hover:text-zinc-900'}`;
  return (
    <div role="tablist" className="mt-4 flex gap-1 rounded-2xl bg-zinc-100 p-1">
      <button type="button" role="tab" aria-selected={step === 'create'} className={tab(step === 'create')} onClick={() => onStep('create')}>
        {step === 'create' && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-xl bg-white shadow-xs" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
        <span className="relative">New here</span>
      </button>
      <button type="button" role="tab" aria-selected={existing} className={tab(existing)} onClick={() => onStep('signin')}>
        {existing && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-xl bg-white shadow-xs" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
        <span className="relative">I have an account</span>
      </button>
    </div>
  );
}
