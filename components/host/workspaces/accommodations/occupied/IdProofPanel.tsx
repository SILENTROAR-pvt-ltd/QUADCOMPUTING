'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react';
import type { PhysicalRoom } from '@/types';

/** The ID photo a self-checked-in guest uploaded, through a link that expires, and the desk's "seen it" tick. */
export function IdProofPanel({ room, onVerified }: { room: PhysicalRoom; onVerified: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The tick shows the moment the desk's confirmation is saved; the room's own refresh catches up behind it.
  const [verifiedAt, setVerifiedAt] = useState<string | null>(room.id_verified_at || null);
  const selfService = room.checkin_source === 'self' || room.checkin_source === 'booking';
  const hasPhoto = Boolean(room.id_proof_path);

  useEffect(() => { setVerifiedAt(room.id_verified_at || null); }, [room.id, room.id_verified_at]);

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
    setBusy(true); setError(null);
    // Never a button stuck on "Saving…": a desk that cannot be reached in 15 s says so and lets the host try again.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 15_000);
    try {
      const res = await fetch(`/api/host/accommodations/rooms/${room.id}/id-proof`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify' }), signal: abort.signal });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) { setVerifiedAt(data.verified_at || new Date().toISOString()); onVerified(); }
      else setError(data?.error || 'The confirmation could not be saved. Please try again.');
    } catch {
      setError('The desk could not be reached. Check the connection and try again.');
    } finally { clearTimeout(timer); setBusy(false); }
  };

  return (
    <section className={`rounded-3xl border p-5 ${verifiedAt ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-950">
            {verifiedAt ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-700" />}
            {room.checkin_source === 'booking' ? (Number(room.advance_paid) > 0 ? 'Self check-in · room paid in advance' : 'Checked in from a booking') : selfService ? 'Self check-in' : 'ID photo on file'}
          </p>
          <p className="mt-0.5 text-xs text-neutral-600">
            {verifiedAt
              ? `ID seen by the desk at ${new Date(verifiedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })}.`
              : 'Compare the photo with the guest and the name they gave, then confirm.'}
          </p>
          {error && <p role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}
        </div>
        {!verifiedAt && (
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
