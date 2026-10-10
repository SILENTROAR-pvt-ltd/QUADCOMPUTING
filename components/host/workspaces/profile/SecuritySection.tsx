'use client';

import { useState } from 'react';
import { KeyRound, Lock, LockOpen, ShieldCheck } from 'lucide-react';
import { ALWAYS_LOCKED } from '@/lib/services/security/protected-modules';
import { useVisibleTabs } from '@/components/host/control-center/useVisibleTabs';
import { Section } from './ProfileFields';
import { PinDialog } from './PinDialog';
import type { PinState } from './useProfile';

interface Props {
  pins: PinState;
  setPins: (p: PinState) => void;
  locks: Record<string, boolean>;
  onLocksChange: (locks: Record<string, boolean>) => void;
  onNotice: (msg: string) => void;
}

function PinCard({ title, text, isSet, onSet, onRemove }: { title: string; text: string; isSet: boolean; onSet: () => void; onRemove: () => void }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-neutral-950"><KeyRound className="h-4 w-4 text-neutral-500" />{title}</p>
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${isSet ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-neutral-100 text-neutral-600 ring-neutral-200'}`}>{isSet ? 'On' : 'Not set'}</span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{text}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onSet} className="h-9 rounded-xl bg-neutral-950 px-3 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer">{isSet ? 'Change PIN' : 'Set PIN'}</button>
        {isSet && <button type="button" onClick={onRemove} className="h-9 rounded-xl px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer">Remove</button>}
      </div>
    </div>
  );
}

/** Master and staff PINs, and which sidebar sections ask for the master PIN. */
export function SecuritySection({ pins, setPins, locks, onLocksChange, onNotice }: Props) {
  const [dialog, setDialog] = useState<{ kind: 'admin' | 'staff'; mode: 'set' | 'remove' } | null>(null);
  const { tabs } = useVisibleTabs();
  const fixed = new Set<string>(ALWAYS_LOCKED);

  return (
    <Section id="security" title="Security & locks" description="Lock sensitive sections so staff using this device can only open what they need."
      aside={<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600"><ShieldCheck className="h-4 w-4" />PINs are stored encrypted</span>}>
      <div className="grid gap-3 md:grid-cols-2">
        <PinCard title="Master PIN" text="Unlocks locked sections. Only the owner or manager should know it." isSet={pins.isAdminPinSet}
          onSet={() => setDialog({ kind: 'admin', mode: 'set' })} onRemove={() => setDialog({ kind: 'admin', mode: 'remove' })} />
        <PinCard title="Staff POS PIN" text="Opens the billing screen for staff, who then pick their name." isSet={pins.isStaffPinSet}
          onSet={() => setDialog({ kind: 'staff', mode: 'set' })} onRemove={() => setDialog({ kind: 'staff', mode: 'remove' })} />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-neutral-900">Sections that need the master PIN</p>
        {!pins.isAdminPinSet && <p className="mt-1 text-xs text-amber-800">These take effect once a master PIN is set.</p>}
        <ul className="mt-3 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
          {tabs.map((t) => {
            const on = fixed.has(t.id) || Boolean(locks[t.id]);
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-2.5 text-sm text-neutral-800">
                  {on ? <Lock className="h-4 w-4 text-neutral-700" /> : <LockOpen className="h-4 w-4 text-neutral-400" />}{t.label}
                  {fixed.has(t.id) && <span className="text-[11px] text-neutral-500">always locked</span>}
                </span>
                <button type="button" role="switch" aria-checked={on} aria-label={`Lock ${t.label}`} disabled={fixed.has(t.id)}
                  onClick={() => onLocksChange({ ...locks, [t.id]: !on })}
                  className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-60 cursor-pointer ${on ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-neutral-500">Lock changes apply when you save the profile.</p>
      </div>

      {dialog && <PinDialog kind={dialog.kind} mode={dialog.mode} pins={pins} onClose={() => setDialog(null)}
        onDone={(p, msg) => { setPins(p); setDialog(null); onNotice(msg); }} />}
    </Section>
  );
}
