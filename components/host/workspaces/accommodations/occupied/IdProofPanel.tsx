'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react';
import type { PhysicalRoom } from '@/types';

/** The ID photo a self-checked-in guest uploaded, through a link that expires, and the desk's "seen it" tick. */
export function IdProofPanel({ room, onVerified }: { room: PhysicalRoom; onVerified: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const selfService = room.checkin_source === 'self' || room.checkin_source === 'booking';
  const hasPhoto = Boolean(room.id_proof_path);

  useEffect(() => {
    if (!hasPhoto) { setUrl(null); return; }
    let alive = true;
    setLoading(true);
    void (async () => {
      const res = await fetch(`/api/host/accommodations/rooms/${room.id}/id-proof`, { cache: 'no-store' }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (alive) { setUrl(data?.url || null); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [room.id, room.id_proof_path, hasPhoto]);

  if (!selfService && !hasPhoto) return null;

  const verify = async () => {
    setBusy(true);
    const res = await fetch(`/api/host/accommodations/rooms/${room.id}/id-proof`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify' }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) onVerified();
  };

  return (
    <section className={`rounded-3xl border p-5 ${room.id_verified_at ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-950">
            {room.id_verified_at ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-700" />}
            {room.checkin_source === 'booking' ? 'Checked in with a booking code' : selfService ? 'Self check-in' : 'ID photo on file'}
          </p>
          <p className="mt-0.5 text-xs text-neutral-600">
            {room.id_verified_at
              ? `ID seen by the desk at ${new Date(room.id_verified_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })}.`
              : 'Compare the photo with the guest and the name they gave, then confirm.'}
          </p>
        </div>
        {!room.id_verified_at && (
          <button type="button" disabled={busy} onClick={() => void verify()} className="h-9 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer">
            {busy ? 'Saving…' : 'ID checked'}
          </button>
        )}
      </div>
      {hasPhoto && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {loading ? <div className="h-48 animate-pulse bg-neutral-100" /> : url ? (
            // eslint-disable-next-line @next/next/no-img-element -- a signed, expiring link to the private bucket
            <img src={url} alt="Guest ID" className="max-h-80 w-full object-contain" />
          ) : <p className="p-4 text-xs text-neutral-500">The photo link could not be created. Reopen the room to try again.</p>}
        </div>
      )}
      {!hasPhoto && selfService && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-neutral-600"><Smartphone className="h-3.5 w-3.5" /> The guest typed an ID number instead of a photo; it is in the dossier above.</p>
      )}
    </section>
  );
}
