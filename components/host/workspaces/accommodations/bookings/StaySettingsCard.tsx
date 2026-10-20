'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Copy, QrCode } from 'lucide-react';
import type { PhysicalRoom } from '@/types';

interface Props { rooms: PhysicalRoom[]; onShowToast: (msg: string) => void }
interface Settings { self_checkin_enabled: boolean; in_room_dining_enabled: boolean; stay_tagline: string | null; checkin_time: string | null; checkout_time: string | null; slug?: string | null }

const Toggle = ({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3.5">
    <span><span className="block text-sm font-semibold text-neutral-900">{label}</span><span className="block text-xs text-neutral-500">{hint}</span></span>
    <input type="checkbox" role="switch" aria-checked={on} checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-9 cursor-pointer accent-neutral-900" />
  </label>
);

/** The public stay page's switches and links: self check-in, in-room dining, the tagline, and each room's QR link. */
export function StaySettingsCard({ rooms, onShowToast }: Props) {
  const [s, setS] = useState<Settings | null>(null);
  const [tagline, setTagline] = useState('');
  const [saving, setSaving] = useState(false);
  const businessId = rooms[0]?.business_id || null;

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/host/accommodations/stay-settings', { cache: 'no-store' }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (data?.settings) { setS(data.settings); setTagline(data.settings.stay_tagline || ''); }
    })();
  }, []);

  const save = async (patch: Partial<Settings>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/host/accommodations/stay-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { onShowToast(data.error || (data.code === 'MASTER_UNLOCK_REQUIRED' ? 'Unlock the master session to change this.' : 'Could not save.')); return; }
      setS((prev) => ({ ...(prev || {} as Settings), ...data.settings }));
      onShowToast('Stay settings saved.');
    } finally { setSaving(false); }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const stayUrl = businessId ? `${origin}/stay/${encodeURIComponent(s?.slug || businessId)}` : '';
  const copy = (text: string, what: string) => { void navigator.clipboard.writeText(text); onShowToast(`${what} copied.`); };

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h3 className="font-serif text-2xl text-neutral-950">Stay page &amp; in-room service</h3>
      <p className="mt-1 text-sm text-neutral-500">Guests reserve from your public stay page, check themselves in, and order to the room from the QR card. Changing the switches needs the master PIN.</p>

      {stayUrl && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs">
          <span className="font-mono text-neutral-700">{stayUrl}</span>
          <button type="button" onClick={() => copy(stayUrl, 'Stay page link')} className="rounded-md p-1 text-neutral-500 hover:bg-neutral-200 cursor-pointer" aria-label="Copy stay page link"><Copy className="h-3.5 w-3.5" /></button>
          <a href={stayUrl} target="_blank" rel="noreferrer" className="rounded-md p-1 text-neutral-500 hover:bg-neutral-200" aria-label="Open stay page"><ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Toggle on={Boolean(s?.self_checkin_enabled)} onChange={(v) => void save({ self_checkin_enabled: v })} label="Self check-in" hint="Guests at the property take a vacant room with a name, phone and ID photo. You review the ID on the room card." />
        <Toggle on={s?.in_room_dining_enabled !== false} onChange={(v) => void save({ in_room_dining_enabled: v })} label="In-room dining" hint="The room QR orders food to the room, charged to the stay. Follows your operating hours." />
      </div>

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
  );
}
