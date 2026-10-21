'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { EMPTY_POLICIES, MAX_OPTIONS, STANDARD_POLICIES, type PolicyKind, type PolicyOption, type StayPolicies } from '@/lib/services/stay/stay-policy';
import type { StaySettings } from './useStaySettings';

interface Props { settings: StaySettings | null; onSaved: (s: StaySettings) => void; onShowToast: (msg: string) => void }

const GROUPS: Array<{ kind: PolicyKind; title: string; hint: string; fresh: PolicyOption }> = [
  { kind: 'early_checkin', title: 'Early check-in', hint: 'A guest who arrives before your check-in time, billed with the room.', fresh: { id: '', label: 'Early check-in from 10:00', time: '10:00', fee_type: 'percent', value: 25 } },
  { kind: 'late_checkout', title: 'Late check-out', hint: 'A guest who asks to stay past check-out; you approve it and take the fee.', fresh: { id: '', label: 'Late check-out until 14:00', time: '14:00', fee_type: 'percent', value: 25 } },
];
const field = 'h-9 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs text-neutral-900 outline-none focus:border-neutral-900';

/** The owner's early check-in and late check-out options and what each costs: a share of one night, or a flat amount. */
export function StayPoliciesCard({ settings, onSaved, onShowToast }: Props) {
  const [draft, setDraft] = useState<StayPolicies | null>(null);
  const [saving, setSaving] = useState(false);
  const current = draft || settings?.stay_policies || EMPTY_POLICIES;

  const edit = (kind: PolicyKind, list: PolicyOption[]) => setDraft({ ...current, [kind]: list });
  const patch = (kind: PolicyKind, i: number, p: Partial<PolicyOption>) => edit(kind, current[kind].map((o, j) => (j === i ? { ...o, ...p } : o)));

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/host/accommodations/stay-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stay_policies: draft }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { onShowToast(data.error || (data.code === 'MASTER_UNLOCK_REQUIRED' ? 'Unlock the master session to change fees.' : 'Could not save.')); return; }
      onSaved(data.settings); setDraft(null); onShowToast('Early check-in and late check-out options saved.');
    } finally { setSaving(false); }
  };

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h3 className="font-serif text-2xl text-neutral-950">Early check-in &amp; late check-out</h3>
      <p className="mt-1 text-sm text-neutral-500">Fees are worked out on the server from the room&apos;s nightly rate, so a guest or a staff member can never type their own. Changing them needs the master PIN.</p>

      {GROUPS.map((g) => (
        <div key={g.kind} className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-sm font-semibold text-neutral-900">{g.title}</p><p className="text-xs text-neutral-500">{g.hint}</p></div>
            <div className="flex gap-2">
              {current[g.kind].length === 0 && <button type="button" onClick={() => edit(g.kind, STANDARD_POLICIES[g.kind])} className="h-8 cursor-pointer rounded-lg border border-neutral-200 px-3 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50">Add standard options</button>}
              <button type="button" disabled={current[g.kind].length >= MAX_OPTIONS} onClick={() => edit(g.kind, [...current[g.kind], g.fresh])} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 px-3 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"><Plus className="h-3 w-3" /> Add</button>
            </div>
          </div>
          {current[g.kind].length === 0 ? <p className="mt-2 text-xs text-neutral-400">Not offered. Guests check in and out at the standard times.</p> : (
            <ul className="mt-3 space-y-2">
              {current[g.kind].map((o, i) => (
                <li key={`${o.id}-${i}`} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-2.5 sm:grid-cols-[1fr_6.5rem_7rem_5.5rem_auto]">
                  <input aria-label="Label" value={o.label} maxLength={60} onChange={(e) => patch(g.kind, i, { label: e.target.value })} className={`${field} col-span-2 sm:col-span-1`} />
                  <input aria-label="Time" type="time" value={o.time} onChange={(e) => patch(g.kind, i, { time: e.target.value })} className={field} />
                  <select aria-label="Fee type" value={o.fee_type} onChange={(e) => patch(g.kind, i, { fee_type: e.target.value as 'flat' | 'percent' })} className={field}><option value="percent">% of a night</option><option value="flat">Flat ₹</option></select>
                  <input aria-label="Fee" type="number" min={0} max={o.fee_type === 'percent' ? 100 : 100000} value={o.value} onChange={(e) => patch(g.kind, i, { value: Number(e.target.value) })} className={field} />
                  <button type="button" aria-label="Remove option" onClick={() => edit(g.kind, current[g.kind].filter((_, j) => j !== i))} className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-neutral-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <div className="mt-5 flex items-center justify-end gap-2">
        {draft && <button type="button" onClick={() => setDraft(null)} className="h-10 cursor-pointer rounded-xl border border-neutral-200 px-4 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">Discard</button>}
        <button type="button" disabled={!draft || saving} onClick={() => void save()} className="h-10 cursor-pointer rounded-xl bg-neutral-950 px-5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Saving…' : 'Save options'}</button>
      </div>
    </section>
  );
}
