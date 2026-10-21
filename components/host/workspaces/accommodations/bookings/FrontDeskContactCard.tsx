'use client';

import React, { useEffect, useState } from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import type { FrontDesk } from '@/lib/services/stay/stay-policy';

interface Props { value: FrontDesk | null; saving: boolean; onSave: (next: FrontDesk) => void }

/** The number a guest in a room reaches the desk on from their phone, and whether it rings or opens WhatsApp. */
export function FrontDeskContactCard({ value, saving, onSave }: Props) {
  const [phone, setPhone] = useState('');
  const [mode, setMode] = useState<FrontDesk['mode']>('call');
  useEffect(() => { if (value) { setPhone(value.phone || ''); setMode(value.mode); } }, [value]);
  const dirty = Boolean(value) && (phone !== (value?.phone || '') || mode !== value?.mode);

  const modes: Array<{ id: FrontDesk['mode']; label: string; Icon: typeof Phone; hint: string }> = [
    { id: 'call', label: 'Direct call', Icon: Phone, hint: 'The room page rings this number' },
    { id: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, hint: 'Opens a WhatsApp chat with the room number filled in' },
  ];

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ phone: phone || null, mode }); }} className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3.5">
      <p className="text-sm font-semibold text-neutral-900">Front desk from the room</p>
      <p className="text-xs text-neutral-500">Every room page gets one button to reach you. Leave the number empty to use the first phone on your menu information.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="How the guest reaches the desk">
        {modes.map(({ id, label, Icon, hint }) => (
          <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
            className={`flex cursor-pointer items-start gap-2.5 rounded-xl border bg-white p-3 text-left transition ${mode === id ? 'border-neutral-900 ring-2 ring-neutral-900/10' : 'border-neutral-200 hover:border-neutral-400'}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${id === 'whatsapp' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-700'}`}><Icon className="h-4 w-4" aria-hidden /></span>
            <span><span className="block text-sm font-semibold text-neutral-900">{label}</span><span className="block text-[11px] leading-snug text-neutral-500">{hint}</span></span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))} placeholder="Desk mobile, e.g. 9876543210" aria-label="Front desk number"
          className="h-10 flex-1 rounded-xl border border-neutral-200 bg-white px-3 font-mono text-sm outline-none focus:border-neutral-900" />
        <button type="submit" disabled={saving || !dirty} className="h-10 cursor-pointer rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Save</button>
      </div>
    </form>
  );
}
