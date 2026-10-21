'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Copy, QrCode } from 'lucide-react';
import type { PhysicalRoom } from '@/types';
import { useStaySettings, type StaySettings as Settings } from './useStaySettings';
import { StayPoliciesCard } from './StayPoliciesCard';
import { FrontDeskContactCard } from './FrontDeskContactCard';

interface Props { rooms: PhysicalRoom[]; onShowToast: (msg: string) => void }

// A button, not a checkbox in a label: the label+input pair fired one change per element per click, so one tap
// toggled the setting several times and could land it back where it started.
const Toggle = ({ on, disabled, onChange, label, hint }: { on: boolean; disabled: boolean; onChange: (v: boolean) => void; label: string; hint: string }) => (
  <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
    className="flex w-full items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3.5 text-left disabled:opacity-60 cursor-pointer">
    <span><span className="block text-sm font-semibold text-neutral-900">{label}</span><span className="block text-xs text-neutral-500">{hint}</span></span>
    <span aria-hidden className={`mt-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${on ? 'bg-neutral-900' : 'bg-neutral-300'}`}>
      <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
    </span>
  </button>
);

/** The public stay page's switches and links: self check-in, in-room dining, the tagline, and each room's QR link. */
export function StaySettingsCard({ rooms, onShowToast }: Props) {
  const { settings: s, setSettings: setS } = useStaySettings();
  const [tagline, setTagline] = useState('');
  const [saving, setSaving] = useState(false);
  const businessId = rooms[0]?.business_id || null;

  useEffect(() => { if (s) setTagline(s.stay_tagline || ''); }, [s?.stay_tagline]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (patch: Partial<Settings> | { front_desk: Settings['stay_policies']['front_desk'] }) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/host/accommodations/stay-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { onShowToast(data.error || (data.code === 'MASTER_UNLOCK_REQUIRED' ? 'Unlock the master session to change this.' : 'Could not save.')); return; }
      setS({ ...(s || {} as Settings), ...data.settings });
      onShowToast('Stay settings saved.');
    } finally { setSaving(false); }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const stayUrl = businessId ? `${origin}/stay/${encodeURIComponent(s?.slug || businessId)}` : '';
  const copy = (text: string, what: string) => { void navigator.clipboard.writeText(text); onShowToast(`${what} copied.`); };

  return (
    <div className="space-y-6">
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h3 className="font-serif text-2xl text-neutral-950">Stay page &amp; in-room service</h3>
      <p className="mt-1 text-sm text-neutral-500">Guests reserve for free from your public stay page. You take the room payment at the desk, and they check themselves in with the link you give them. Changing the switches needs the master PIN.</p>
      {s && !s.upi_id && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">No UPI ID is saved for this venue, so the payment screen cannot show a UPI QR. Add it under Profile, or take cash and card.</p>}

      {stayUrl && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs">
          <span className="font-mono text-neutral-700">{stayUrl}</span>
          <button type="button" onClick={() => copy(stayUrl, 'Stay page link')} className="rounded-md p-1 text-neutral-500 hover:bg-neutral-200 cursor-pointer" aria-label="Copy stay page link"><Copy className="h-3.5 w-3.5" /></button>
          <a href={stayUrl} target="_blank" rel="noreferrer" className="rounded-md p-1 text-neutral-500 hover:bg-neutral-200" aria-label="Open stay page"><ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Toggle on={Boolean(s?.self_checkin_enabled)} disabled={saving || !s} onChange={(v) => void save({ self_checkin_enabled: v })} label="Self check-in" hint="A guest whose room you have been paid for opens their link, adds an ID photo and gets a room. You review the ID on the room card." />
        <Toggle on={s?.in_room_dining_enabled !== false} disabled={saving || !s} onChange={(v) => void save({ in_room_dining_enabled: v })} label="In-room dining" hint="The room QR orders food to the room, charged to the stay. Follows your operating hours." />
      </div>

      <FrontDeskContactCard value={s?.stay_policies?.front_desk || null} saving={saving} onSave={(front_desk) => void save({ front_desk })} />

      <form onSubmit={(e) => { e.preventDefault(); void save({ stay_tagline: tagline }); }} className="mt-3 flex gap-2">
        <input value={tagline} onChange={(e) => setTagline(e.target.value.slice(0, 120))} placeholder="A line for the stay page (optional)" className="h-10 flex-1 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900" />
        <button type="submit" disabled={saving} className="h-10 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer">Save</button>
      </form>

      {rooms.length > 0 && (
        <details className="mt-4 rounded-xl border border-neutral-200">
          <summary className="cursor-pointer px-3.5 py-2.5 text-sm font-semibold text-neutral-900"><QrCode className="mr-1.5 inline h-4 w-4" /> Room QR links ({rooms.length})</summary>
          <ul className="divide-y divide-neutral-100 px-3.5 text-xs">
            {rooms.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <span className="font-mono font-semibold text-neutral-900">{r.room_number}</span>
                {r.qr_code_hash ? (
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="truncate font-mono text-neutral-500">{`${origin}/room/${r.qr_code_hash}`}</span>
                    <button type="button" onClick={() => copy(`${origin}/room/${r.qr_code_hash}`, `Room ${r.room_number} link`)} className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 cursor-pointer" aria-label={`Copy room ${r.room_number} link`}><Copy className="h-3.5 w-3.5" /></button>
                  </span>
                ) : <span className="text-neutral-400">Link appears after the first check-in</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
    <StayPoliciesCard settings={s} onSaved={setS} onShowToast={onShowToast} />
    </div>
  );
}
