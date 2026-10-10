'use client';

import React from 'react';
import { User, Phone, Mail, MapPin } from 'lucide-react';
import { CheckInIdDocFields } from './CheckInIdDocFields';

interface Props {
  guestName: string;
  setGuestName: (val: string) => void;
  guestPhone: string;
  setGuestPhone: (val: string) => void;
  guestEmail?: string;
  setGuestEmail?: (val: string) => void;
  guestAddress?: string;
  setGuestAddress?: (val: string) => void;
  idProofType: string;
  setIdProofType: (val: string) => void;
  idProofNumber: string;
  setIdProofNumber: (val: string) => void;
}

const inputClass = "w-full bg-neutral-50/80 border border-neutral-200 focus:border-neutral-900 text-neutral-900 rounded-xl px-4 py-3 text-xs sm:text-sm outline-none transition-all focus:bg-white";
const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500";

export function CheckInGuestSection({
  guestName, setGuestName, guestPhone, setGuestPhone,
  guestEmail = '', setGuestEmail, guestAddress = '', setGuestAddress,
  idProofType, setIdProofType, idProofNumber, setIdProofNumber,
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-xs">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
        <User className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">01. Guest Credentials & Identification</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="panelGuestName" className={labelClass}>Guest Full Name *</label>
          <input id="panelGuestName" type="text" required placeholder="e.g. Vikramaditya Sharma" value={guestName} onChange={(e) => setGuestName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="panelGuestPhone" className={labelClass}>Contact Phone Number *</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-zinc-400" />
            <input id="panelGuestPhone" type="tel" required placeholder="+91 98765 43210" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className={`${inputClass} pl-9 font-mono`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="panelGuestEmail" className={labelClass}>Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-zinc-400" />
            <input id="panelGuestEmail" type="email" placeholder="guest@example.com" value={guestEmail} onChange={(e) => setGuestEmail?.(e.target.value)} className={`${inputClass} pl-9`} />
          </div>
        </div>
        <div>
          <label htmlFor="panelGuestAddress" className={labelClass}>Residential Address / City</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-zinc-400" />
            <input id="panelGuestAddress" type="text" placeholder="e.g. South Delhi, New Delhi" value={guestAddress} onChange={(e) => setGuestAddress?.(e.target.value)} className={`${inputClass} pl-9`} />
          </div>
        </div>
      </div>

      <CheckInIdDocFields idProofType={idProofType} setIdProofType={setIdProofType} idProofNumber={idProofNumber} setIdProofNumber={setIdProofNumber} />
    </div>
  );
}
