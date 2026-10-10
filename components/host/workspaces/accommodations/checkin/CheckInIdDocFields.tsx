'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface Props {
  idProofType: string;
  setIdProofType: (val: string) => void;
  idProofNumber: string;
  setIdProofNumber: (val: string) => void;
}

const inputClass = "w-full bg-neutral-50/80 border border-neutral-200 focus:border-neutral-900 text-neutral-900 rounded-xl px-4 py-3 text-xs sm:text-sm outline-none transition-all focus:bg-white";
const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500";

export function CheckInIdDocFields({ idProofType, setIdProofType, idProofNumber, setIdProofNumber }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
      <div>
        <label htmlFor="idProofType" className={labelClass}>ID Proof Document</label>
        <select
          id="idProofType"
          value={idProofType}
          onChange={(e) => setIdProofType(e.target.value)}
          className={`${inputClass} py-3 cursor-pointer`}
        >
          <option value="Aadhaar Card">Aadhaar Card</option>
          <option value="Passport">Passport</option>
          <option value="Driving License">Driving License</option>
          <option value="Voter ID">Voter ID</option>
          <option value="National Identity Card">National Identity Card</option>
        </select>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="idProofNumber" className={labelClass}>ID Document Number / Reference</label>
        <div className="relative">
          <ShieldCheck className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            id="idProofNumber"
            type="text"
            placeholder="e.g. 5432 9876 1234 or P1234567"
            value={idProofNumber}
            onChange={(e) => setIdProofNumber(e.target.value)}
            className={`${inputClass} pl-9 font-mono uppercase`}
          />
        </div>
      </div>
    </div>
  );
}
