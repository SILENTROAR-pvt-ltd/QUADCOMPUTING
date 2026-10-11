'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { Label, field } from '../ui';
import type { ApplyForm } from './apply-form';

/** Viber ID (the shared @handle), real name, optional masked club name, and a vibe line. */
export function StepIdentity({ form, set, lockedId, askPin }: { form: ApplyForm; set: (patch: Partial<ApplyForm>) => void; lockedId: string | null; askPin: boolean }) {
  return (
    <div className="space-y-4">
      <Label text="Your name" hint="staff always see it">
        <input className={field} autoComplete="name" value={form.display_name} onChange={(e) => set({ display_name: e.target.value })} placeholder="Asha Rao" />
      </Label>
      <Label text="Viber ID" hint="your @handle at every Vibers property">
        {lockedId ? (
          <p className="flex items-center gap-2 rounded-xl border border-[#2a1250]/10 bg-[#f3ebff]/50 px-3.5 py-2.5 text-sm font-semibold">
            <Lock aria-hidden="true" className="h-3.5 w-3.5 text-[#2a1250]/50" /> {lockedId}
            <span className="ml-auto text-xs font-normal text-[#2a1250]/55">from your Vibers account</span>
          </p>
        ) : (
          <span className="relative block">
            <span aria-hidden="true" className="absolute inset-y-0 left-3.5 grid place-items-center text-sm text-[#2a1250]/45">@</span>
            <input className={`${field} pl-8`} autoCapitalize="none" autoCorrect="off" value={form.viber_id.replace(/^@/, '')}
              onChange={(e) => set({ viber_id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) })} placeholder="asha_travels" />
          </span>
        )}
      </Label>
      {askPin && (
        <Label text="Your old 6-digit PIN for this handle" hint="brings your property wallets with you">
          <input className={`${field} tracking-[0.4em]`} type="password" inputMode="numeric" maxLength={6} value={form.legacy_pin}
            onChange={(e) => set({ legacy_pin: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
        </Label>
      )}
      <Label text="Club name" hint="optional alias">
        <input className={field} value={form.alias} onChange={(e) => set({ alias: e.target.value })} placeholder="Night Owl" maxLength={30} />
      </Label>
      <label className="flex items-start gap-3 rounded-2xl border border-[#2a1250]/10 bg-white p-3.5 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#7c3aed]" checked={form.alias_masked} onChange={(e) => set({ alias_masked: e.target.checked })} />
        <span>
          <span className="font-semibold">Mask my identity</span>
          <span className="block text-xs text-[#2a1250]/60">Members see only your club name, never your Viber ID or real name. Staff can always see who you are, for everyone&apos;s safety.</span>
        </span>
      </label>
      <Label text="Your vibe line" hint="one line on your profile">
        <input className={field} value={form.vibe_line} onChange={(e) => set({ vibe_line: e.target.value })} maxLength={120} placeholder="Sunrise treks, late-night chai" />
      </Label>
    </div>
  );
}
