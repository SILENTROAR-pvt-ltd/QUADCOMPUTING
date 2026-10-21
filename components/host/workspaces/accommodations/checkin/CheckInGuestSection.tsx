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
}

/** Who is checking in: name and phone (needed), email and address (if given), and the ID shown at the desk. */
export function CheckInGuestSection(p: Props) {
  return (
    <CheckInSection icon={User} title="Guest" hint="Name and mobile are required; the ID is kept for the register.">
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
      </div>
    </CheckInSection>
  );
}
