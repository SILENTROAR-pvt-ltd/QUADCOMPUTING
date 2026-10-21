'use client';

import React from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { CHEVRON, ICON, INPUT_ICON, LABEL, SELECT } from './field-styles';

interface Props {
  idProofType: string;
  setIdProofType: (val: string) => void;
  idProofNumber: string;
  setIdProofNumber: (val: string) => void;
}

const ID_TYPES = ['Aadhaar Card', 'Passport', 'Driving License', 'Voter ID', 'National Identity Card'];

/** The government ID the guest showed at the desk: which document, and its number. */
export function CheckInIdDocFields({ idProofType, setIdProofType, idProofNumber, setIdProofNumber }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
      <div className="sm:col-span-2">
        <label htmlFor="idProofType" className={LABEL}>ID document</label>
        <div className="relative">
          <select id="idProofType" value={idProofType} onChange={(e) => setIdProofType(e.target.value)} className={SELECT}>
            {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown className={CHEVRON} aria-hidden />
        </div>
      </div>
      <div className="sm:col-span-3">
        <label htmlFor="idProofNumber" className={LABEL}>ID number</label>
        <div className="relative">
          <ShieldCheck className={ICON} aria-hidden />
          <input id="idProofNumber" type="text" autoCapitalize="characters" placeholder="As printed on the document" value={idProofNumber} onChange={(e) => setIdProofNumber(e.target.value)} className={`${INPUT_ICON} font-mono uppercase`} />
        </div>
      </div>
    </div>
  );
}
