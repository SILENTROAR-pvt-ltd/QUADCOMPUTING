'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, todayIst, type StayType, type StayVenue } from '../stay-format';

export type Step = 'guest' | 'id' | 'room' | 'done';

export interface CheckInForm {
  guestName: string; guestPhone: string; guestEmail: string; totalGuests: number; checkOut: string;
  idType: string; idNumber: string; bookingCode: string; categoryId: string;
}

const ID_TYPES = ['Aadhaar', 'Passport', 'Driving licence', 'Voter ID', 'Other'];

/** The self check-in flow: venue and room types, the guest's details, the ID photo upload, and the check-in itself. */
export function useSelfCheckIn(venueParam: string) {
  const router = useRouter();
  const [venue, setVenue] = useState<StayVenue | null>(null);
  const [types, setTypes] = useState<StayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('guest');
  const [form, setForm] = useState<CheckInForm>({
    guestName: '', guestPhone: '', guestEmail: '', totalGuests: 2, checkOut: addDays(todayIst(), 1), idType: ID_TYPES[0], idNumber: '', bookingCode: '', categoryId: '',
  });
  const [idProofPath, setIdProofPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guest/stay/showcase?venue=${encodeURIComponent(venueParam)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setLoadError(data.error || 'This venue could not be found.'); return; }
      setVenue(data.venue); setTypes(data.types || []); setLoadError(null);
    } catch { setLoadError('Could not reach the venue. Check your connection.'); } finally { setLoading(false); }
  }, [venueParam]);
  useEffect(() => { void load(); }, [load]);

  const update = (patch: Partial<CheckInForm>) => setForm((f) => ({ ...f, ...patch }));

  const uploadId = async (file: File) => {
    if (!venue) return;
    setUploading(true); setError(null);
    try {
      const body = new FormData();
      body.append('venue', venue.id);
      body.append('file', file);
      const res = await fetch('/api/guest/stay/id-proof', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.error || 'The photo could not be uploaded.'); return; }
      setIdProofPath(data.id_proof_path);
    } catch { setError('The photo could not be uploaded. Check your connection.'); } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!venue) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/guest/stay/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue: venue.id, guest_name: form.guestName, guest_phone: form.guestPhone, guest_email: form.guestEmail || null,
          total_guests: form.totalGuests, check_out: form.checkOut, id_type: form.idType, id_number: form.idNumber || null,
          id_proof_path: idProofPath, booking_code: form.bookingCode || null, category_id: form.categoryId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.error || 'The check-in could not be completed.'); return; }
      setStep('done');
      router.push(`/room/${encodeURIComponent(data.room_code)}?welcome=1`);
    } catch { setError('Network error. Check your connection and try again.'); } finally { setBusy(false); }
  };

  return { venue, types, loading, loadError, reload: load, step, setStep, form, update, idProofPath, uploadId, uploading, busy, error, setError, submit, ID_TYPES };
}
