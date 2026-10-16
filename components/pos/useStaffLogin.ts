'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PIN_LENGTH } from './StaffKeypad';

/** The PIN sign-in: send the PIN once four digits are in, show what went wrong, and go to the terminal on success. */
export function useStaffLogin(businessId: string) {
  const router = useRouter();
  const [pin, setPinState] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);

  const submit = async (staffId: string, digits: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/staff-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ business_id: businessId, staff_id: staffId, pin: digits }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.redirect) {
        router.replace(data.redirect);
        return;
      }
      setError(data?.error || 'Could not sign you in. Please try again.');
      setWrong(true);
      setTimeout(() => { setWrong(false); setPinState(''); }, 600);
    } catch {
      setError('No connection. Please check the network and try again.');
      setPinState('');
    } finally {
      setBusy(false);
    }
  };

  /** Updates the PIN; the fourth digit signs in at once. */
  const setPin = (next: string, staffId: string | null) => {
    setError(null);
    setPinState(next);
    if (staffId && next.length === PIN_LENGTH && !busy) void submit(staffId, next);
  };

  return { pin, setPin, reset: () => { setPinState(''); setError(null); }, busy, error, wrong };
}
