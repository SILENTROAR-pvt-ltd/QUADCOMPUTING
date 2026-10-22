'use client';

import React from 'react';
import { Mail, MapPin, Phone, User } from 'lucide-react';
import { CheckInSection } from './CheckInSection';
import { CheckInIdDocFields } from './CheckInIdDocFields';
import { ICON, INPUT, INPUT_ICON, LABEL } from './field-styles';

interface Props {
  guestName: string; setGuestName: (val: string) => void;
  guestPhone: string; setGuestPhone: (val: string) => void;
  guestEmail?: string; setGuestEmail?: (val: string) => void;
  guestAddress?: string; setGuestAddress?: (val: string) => void;
  idProofType: string; setIdProofType: (val: string) => void;
  idProofNumber: string; setIdProofNumber: (val: string) => void;
  consent: boolean; setConsent: (val: boolean) => void;
}

/**
 * Who is checking in: name, phone, the ID seen at the desk and the guest's consent (all required: a desk check-in
 * records what self check-in asks the guest for), and email and address if given.
 */
export function CheckInGuestSection(p: Props) {
  return (
    <CheckInSection icon={User} title="Guest" hint="Fields marked * are needed for the register.">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="panelGuestName" className={LABEL}>Full name *</label>
            <input id="panelGuestName" type="text" required autoComplete="name" placeholder="As on the ID" value={p.guestName} onChange={(e) => p.setGuestName(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label htmlFor="panelGuestPhone" className={LABEL}>Mobile *</label>
            <div className="relative">
              <Phone className={ICON} aria-hidden />
              <input id="panelGuestPhone" type="tel" required inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" value={p.guestPhone} onChange={(e) => p.setGuestPhone(e.target.value)} className={`${INPUT_ICON} font-mono`} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="panelGuestEmail" className={LABEL}>Email</label>
            <div className="relative">
              <Mail className={ICON} aria-hidden />
              <input id="panelGuestEmail" type="email" inputMode="email" autoComplete="email" placeholder="For the invoice (optional)" value={p.guestEmail || ''} onChange={(e) => p.setGuestEmail?.(e.target.value)} className={INPUT_ICON} />
            </div>
          </div>
          <div>
            <label htmlFor="panelGuestAddress" className={LABEL}>City / address</label>
            <div className="relative">
              <MapPin className={ICON} aria-hidden />
              <input id="panelGuestAddress" type="text" autoComplete="address-level2" placeholder="Where the guest is from (optional)" value={p.guestAddress || ''} onChange={(e) => p.setGuestAddress?.(e.target.value)} className={INPUT_ICON} />
            </div>
          </div>
        </div>
        <CheckInIdDocFields idProofType={p.idProofType} setIdProofType={p.setIdProofType} idProofNumber={p.idProofNumber} setIdProofNumber={p.setIdProofNumber} />
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs leading-snug text-neutral-700">
          <input type="checkbox" required checked={p.consent} onChange={(e) => p.setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-neutral-950" />
          <span>I have seen this ID, and the guest agrees to it being kept for the guest register. *</span>
        </label>
      </div>
    </CheckInSection>
  );
}
