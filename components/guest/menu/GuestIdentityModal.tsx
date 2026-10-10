'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AtSign, User, Phone, Check } from 'lucide-react';
import { CURATED_AVATARS, sanitizeHandle, syncGuestWalletIdentity, type IdentityProfile } from './guest-identity.util';

interface Props {
  isOpen: boolean; onClose: () => void; initialName?: string; initialPhone?: string; initialHandle?: string;
  initialAvatar?: string; estimatedCashback?: number; cafeId?: string; tableNumber?: string;
  onSaveProfile: (profile: IdentityProfile) => void;
  /** When set, the guest may continue without a wallet profile (no cashback). */
  onSkip?: () => void;
}

export const GuestIdentityModal: React.FC<Props> = ({
  isOpen, onClose, initialName = '', initialPhone = '', initialHandle = '',
  initialAvatar = '🎩', estimatedCashback = 0, cafeId, tableNumber, onSaveProfile, onSkip,
}) => {
  const [name, setName] = useState(initialName), [phone, setPhone] = useState(initialPhone);
  const [handle, setHandle] = useState(() => initialHandle ? sanitizeHandle(initialHandle) : (initialName ? sanitizeHandle(initialName) : ''));
  const [avatar, setAvatar] = useState(initialAvatar || '🎩'), [err, setErr] = useState('');

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanName = name.trim(), cleanHandle = sanitizeHandle(handle), cleanPhone = phone.trim();
    if (!cleanName) return setErr('Please enter your name.');
    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 8) return setErr('Please enter a valid mobile number.');
    if (!cleanHandle || cleanHandle.length < 2) return setErr('Please choose a wallet handle (at least 2 characters).');
    setErr('');
    const profile = { name: cleanName, handle: cleanHandle, phone: cleanPhone, avatar };
    await syncGuestWalletIdentity(cafeId, tableNumber, profile);
    onSaveProfile(profile);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
            style={{ maxHeight: '92dvh' }}
            className="w-full max-w-md overflow-y-auto overscroll-contain bg-white rounded-t-[32px] sm:rounded-3xl border-t sm:border border-zinc-200/80 p-6 shadow-2xl relative text-zinc-950"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-10 w-10 shrink-0 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-editorial text-xl font-normal text-zinc-950 leading-tight">
                    {estimatedCashback > 0 ? `Earn ₹${estimatedCashback} cashback on this order` : 'Earn cashback on this order'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">7% of every bill goes to your wallet here. Save your details once.</p>
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 -mr-1 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-black cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="space-y-3.5 pt-5" noValidate>
              <label className="block">
                <span className="text-[11px] font-medium text-zinc-600">Name</span>
                <div className="relative mt-1">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="text" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); if (!handle) setHandle(sanitizeHandle(e.target.value)); }} placeholder="Your name" className="w-full text-sm font-sans pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-900 focus:outline-none transition-all" />
                </div>
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-zinc-600">Mobile number</span>
                <div className="relative mt-1">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" className="w-full text-sm font-sans pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-900 focus:outline-none transition-all" />
                </div>
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-zinc-600">Wallet handle <span className="text-zinc-400 font-normal">· shown in the social lobby</span></span>
                <div className="relative mt-1">
                  <AtSign className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="text" autoCapitalize="none" autoCorrect="off" value={handle} onChange={(e) => setHandle(sanitizeHandle(e.target.value))} placeholder="yourname" className="w-full text-sm font-sans pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-950 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-900 focus:outline-none transition-all" />
                </div>
              </label>
              <div>
                <span className="text-[11px] font-medium text-zinc-600">Avatar</span>
                <div className="mt-1 flex items-center gap-1.5">
                  {CURATED_AVATARS.map((a) => (
                    <button key={a.id} type="button" onClick={() => setAvatar(a.icon)} title={a.label} aria-pressed={avatar === a.icon}
                      className={`relative h-9 w-9 rounded-xl text-base flex items-center justify-center border transition-all cursor-pointer ${avatar === a.icon ? 'bg-white border-zinc-900 shadow-xs' : 'bg-zinc-50 border-zinc-200 opacity-70 hover:opacity-100'}`}
                    >
                      {a.icon}
                      {avatar === a.icon && <span className="absolute -bottom-1 -right-1 bg-zinc-950 text-white p-0.5 rounded-full"><Check className="w-2 h-2 stroke-[3]" /></span>}
                    </button>
                  ))}
                </div>
              </div>
              {err && <p role="alert" className="text-xs text-rose-600 font-medium">{err}</p>}
              <button type="submit" className="w-full py-3 rounded-2xl bg-zinc-950 text-white font-semibold text-sm hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-lg shadow-zinc-950/10 cursor-pointer">
                {onSkip ? 'Save & place order' : 'Save details'}
              </button>
              {onSkip && (
                <button type="button" onClick={onSkip} className="w-full py-2.5 rounded-2xl text-zinc-600 font-medium text-sm hover:text-zinc-950 hover:bg-zinc-50 transition-all cursor-pointer">
                  Continue as guest
                </button>
              )}
              <p className="text-[10.5px] text-zinc-400 text-center leading-relaxed">
                Your number is only used to find your wallet at this venue.
                {onSkip ? ' Guests can order without it; no cashback is credited.' : ''}
              </p>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
