'use client';

import { useEffect, useState } from 'react';
import type { PartyMix } from '@/lib/services/live-events/party';

export interface Prefill { signedIn: boolean; name: string; handle: string | null; email: string | null; hasPhone: boolean }
const EMPTY: Prefill = { signedIn: false, name: '', handle: null, email: null, hasPhone: false };

/** The "I'm Interested" form's state: what the guest's sign-in fills in, and sending the lead. */
export function useEventInterest(venueId: string, eventId: string) {
  const [prefill, setPrefill] = useState<Prefill>(EMPTY);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/guest/events/prefill?venue_id=${encodeURIComponent(venueId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j?.success) setPrefill({ signedIn: j.signedIn, name: j.name || '', handle: j.handle, email: j.email, hasPhone: j.hasPhone }); })
      .catch(() => { /* an empty form is fine */ })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [venueId]);

  const submit = async (input: { party: PartyMix; name: string; phone: string; email: string }): Promise<{ message: string } | null> => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/guest/events/interest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venueId, event_id: eventId, party: input.party, name: input.name, phone: input.phone, email: input.email }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) return { message: json.message };
      setError(json?.error || 'That did not go through. Please try again.');
    } catch {
      setError('No connection. Please check the network and try again.');
    } finally {
      setBusy(false);
    }
    return null;
  };

  return { prefill, ready, busy, error, submit };
}
