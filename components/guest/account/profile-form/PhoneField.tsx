'use client';

import React from 'react';
import { Phone } from 'lucide-react';
import { authField } from '../AuthFields';

const COUNTRY_CODES = [
  { code: '91', label: '+91 India' }, { code: '1', label: '+1 US / Canada' }, { code: '44', label: '+44 UK' },
  { code: '971', label: '+971 UAE' }, { code: '65', label: '+65 Singapore' }, { code: '61', label: '+61 Australia' },
  { code: '977', label: '+977 Nepal' }, { code: '94', label: '+94 Sri Lanka' }, { code: '880', label: '+880 Bangladesh' },
];

/** What is sent to the server. India (the default) stays the plain 10-digit number accounts already use. */
export function fullPhone(code: string, typed: string): string {
  const digits = typed.replace(/\D/g, '');
  return code === '91' ? digits : `${code}${digits.replace(/^0+/, '')}`;
}

interface PhoneFieldProps {
  code: string;
  onCode: (c: string) => void;
  value: string;
  onChange: (v: string) => void;
}

/** A mobile number with its country code. */
export function PhoneField({ code, onCode, value, onChange }: PhoneFieldProps) {
  return (
    <div>
      <span className="text-[11px] font-medium text-zinc-600">Mobile number</span>
      <div className="mt-1 flex gap-2">
        <select aria-label="Country code" value={code} onChange={(e) => onCode(e.target.value)}
          className="w-[6.2rem] shrink-0 cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2.5 text-[16px] text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none sm:text-sm">
          {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        <span className="relative block flex-1">
          <Phone aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input className={authField} type="tel" inputMode="tel" autoComplete="tel-national" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Mobile number" />
        </span>
      </div>
    </div>
  );
}
