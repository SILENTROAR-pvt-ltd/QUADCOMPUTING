'use client';

import { useEffect, useState } from 'react';

export interface DeliveryTermsForm {
  enabled: boolean;
  /** Kept as text while the owner types; parsed when saved. */
  radiusKm: string;
  minOrder: string;
  fee: string;
  venueLat: number | null;
  venueLng: number | null;
}

const EMPTY: DeliveryTermsForm = { enabled: false, radiusKm: '5', minOrder: '0', fee: '0', venueLat: null, venueLng: null };

/** The venue's delivery terms: radius, minimum order, fee and the venue's location. Saved on its own, like the hours. */
export function useDeliveryTerms() {
  const [form, setForm] = useState<DeliveryTermsForm | null>(null);
  const [saved, setSaved] = useState<DeliveryTermsForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/host/delivery-settings', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Delivery settings could not be loaded.');
        const s = json.settings;
        const next: DeliveryTermsForm = {
          enabled: Boolean(s.enabled), radiusKm: String(s.radiusKm), minOrder: String(s.minOrder), fee: String(s.fee),
          venueLat: s.venueLat, venueLng: s.venueLng,
        };
        setForm(next); setSaved(next);
      } catch (e: any) {
        setLoadError(e.message);
        setForm(EMPTY);
      }
    })();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const dirty = Boolean(form && saved) && JSON.stringify(form) !== JSON.stringify(saved);

  const update = (patch: Partial<DeliveryTermsForm>) => setForm((f) => (f ? { ...f, ...patch } : f));

  /** Sets the venue's location to where this device is. The owner does this while standing at the venue. */
  const useDeviceLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('This device cannot share its location. Try again on your phone or laptop browser.');
      return;
    }
    setLocating(true); setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update({ venueLat: Number(pos.coords.latitude.toFixed(6)), venueLng: Number(pos.coords.longitude.toFixed(6)) });
        setLocating(false);
      },
      () => { setError('Location was not shared. Allow location for this site, then try again.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const save = async () => {
    if (!form) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/host/delivery-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: form.enabled, radiusKm: Number(form.radiusKm), minOrder: Number(form.minOrder || 0), fee: Number(form.fee || 0),
          venueLat: form.venueLat, venueLng: form.venueLng,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || 'Nothing was saved. Please try again.'); return; }
      setSaved(form);
      setNotice('Delivery terms saved. Guests see them in their cart.');
    } catch {
      setError('No connection. Nothing was saved.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => { setForm(saved); setError(null); };

  return { form, update, save, discard, dirty, saving, locating, useDeviceLocation, error, notice, loadError };
}
