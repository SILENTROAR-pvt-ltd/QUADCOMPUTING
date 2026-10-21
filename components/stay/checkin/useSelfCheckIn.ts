'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { forgetJsonSeeds } from '@/lib/guest/menu-seed';
import type { StayVenue } from '../stay-format';

export type Phase = 'loading' | 'gate' | 'blocked' | 'used' | 'form';
export type Step = 'guest' | 'id' | 'confirm';

export interface PassView {
  status: 'issued' | 'used' | 'void' | 'expired'; guest_first_name: string; guest_name: string; invoice_id: string | null; guests: number; check_in: string; check_out: string; nights: number;
  amount: number; paid_at: string; payment_method: string; lines: Array<{ id: string; name: string; price: number; qty: number; notes?: string }>;
  room_type: string | null; photo: string | null;
}

export interface CheckInForm {
  guestName: string; guestEmail: string; totalGuests: number; idType: string; idNumber: string;
  foreign: boolean; passportNumber: string; countryOfOrigin: string; consent: boolean;
}

export const ID_TYPES = ['Aadhaar', 'Passport', 'Driving licence', 'Voter ID', 'Other'];
const post = (url: string, body: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/**
 * Self check-in for a guest whose room has been paid for at the desk. The page opens from the link the desk gave them
 * (?p=...), or from the booking code and the last four digits of the phone once the desk has confirmed payment; with
 * neither it asks for the code. Nothing here takes money or chooses a room: the pass says what was paid for.
 */
export function useSelfCheckIn(venueParam: string) {
  const router = useRouter();
  const search = useSearchParams();
  const [token, setToken] = useState<string | null>(search.get('p'));
  const [phase, setPhase] = useState<Phase>('loading');
  const [venue, setVenue] = useState<(Pick<StayVenue, 'id' | 'name'> & { gstin?: string | null; address?: string | null }) | null>(null);
  const [pass, setPass] = useState<PassView | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('guest');
  const [form, setForm] = useState<CheckInForm>({ guestName: '', guestEmail: '', totalGuests: 2, idType: ID_TYPES[0], idNumber: '', foreign: false, passportNumber: '', countryOfOrigin: '', consent: false });
  const [idProofPath, setIdProofPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      if (!token) {
        // Only the venue's name is needed to ask for the code; the showcase answer is cached at the edge.
        const res = await fetch(`/api/guest/stay/showcase?venue=${encodeURIComponent(venueParam)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) { setMessage(data.error || 'This venue could not be found.'); setPhase('blocked'); return; }
        setVenue({ id: data.venue.id, name: data.venue.name });
        setPhase(data.venue.self_checkin_enabled ? 'gate' : 'blocked');
        if (!data.venue.self_checkin_enabled) setMessage('This venue checks guests in at the desk. Please ask for the front desk.');
        return;
      }
      const res = await fetch(`/api/guest/stay/pass?venue=${encodeURIComponent(venueParam)}&p=${encodeURIComponent(token)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setMessage(data.error || 'This check-in link is not valid. Ask the desk for a new one.'); setPhase('blocked'); return; }
      setVenue({ id: data.venue.id, name: data.venue.name, gstin: data.venue.gstin || null, address: data.venue.address || null });
      setPass(data.pass); setRoomCode(data.room_code || null);
      setForm((f) => ({ ...f, guestName: f.guestName || '', totalGuests: data.pass.guests }));
      if (!data.venue.self_checkin_enabled) { setMessage('Self check-in is not open right now. Please see the front desk.'); setPhase('blocked'); return; }
      if (data.pass.status === 'used') setPhase('used');
      else if (data.pass.status !== 'issued') { setMessage(data.pass.status === 'expired' ? 'This check-in link has expired. Please see the front desk.' : 'This check-in link was cancelled. Please see the front desk.'); setPhase('blocked'); }
      else setPhase('form');
    } catch { setMessage('Could not reach the venue. Check your connection and try again.'); setPhase('blocked'); }
  }, [venueParam, token]);
  useEffect(() => { void load(); }, [load]);

  /** The gate found a paid pass for this booking: carry on with it, and keep it in the address so a refresh stays put. */
  const acceptToken = useCallback((t: string) => { setToken(t); router.replace(`/stay/${encodeURIComponent(venueParam)}/checkin?p=${t}`); }, [router, venueParam]);

  const update = (patch: Partial<CheckInForm>) => setForm((f) => ({ ...f, ...patch }));

  const uploadId = async (file: File) => {
    if (!venue || !token) return;
    setUploading(true); setError(null);
    try {
      const body = new FormData();
      body.append('venue', venue.id); body.append('pass_token', token); body.append('file', file);
      const res = await fetch('/api/guest/stay/id-proof', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.error || 'The photo could not be uploaded.'); return; }
      setIdProofPath(data.id_proof_path);
    } catch { setError('The photo could not be uploaded. Check your connection.'); } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!venue || !token || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await post('/api/guest/stay/checkin', {
        venue: venue.id, pass_token: token, guest_name: form.guestName, guest_email: form.guestEmail || null, total_guests: form.totalGuests,
        id_type: form.idType, id_number: form.idNumber || null, id_proof_path: idProofPath, dpdp_consent_accepted: form.consent, consent_timestamp: new Date().toISOString(),
        is_foreign_national: form.foreign, passport_number: form.foreign ? form.passportNumber : null, country_of_origin: form.foreign ? form.countryOfOrigin : null,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.error || 'The check-in could not be completed.'); return; }
      // The Stay tab, tile and page open from their last answer; from now on that answer must say "your room".
      forgetJsonSeeds('/api/guest/stay/mine');
      router.push(`/room/${encodeURIComponent(data.room_code)}?welcome=1`);
    } catch { setError('Network error. Check your connection and try again.'); } finally { setBusy(false); }
  };

  return { phase, venue, pass, roomCode, message, step, setStep, form, update, idProofPath, uploadId, uploading, busy, error, submit, acceptToken, reload: load };
}
