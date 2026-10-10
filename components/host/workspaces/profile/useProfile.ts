'use client';

import { useCallback, useEffect, useState } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { fromServer, sameForm, setPath, type ProfileForm } from './profile-form';

export interface PinState { isAdminPinSet: boolean; isStaffPinSet: boolean }

/** Loads the profile, tracks unsaved changes, saves, and keeps the sidebar in step with the venue type. */
export function useProfile() {
  const patchProfile = useHostWorkspace((s) => s.patchProfile);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [saved, setSaved] = useState<ProfileForm | null>(null);
  const [pins, setPins] = useState<PinState>({ isAdminPinSet: false, isStaffPinSet: false });
  const [preselectedStay, setPreselectedStay] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/host/profile', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Your profile could not be loaded.');
      const { form: f, preselectedStay: pre } = fromServer(json);
      setForm(f); setSaved(f); setPreselectedStay(pre);
      setPins({ isAdminPinSet: Boolean(json.isAdminPinSet), isStaffPinSet: Boolean(json.isStaffPinSet) });
      setLoadError(null);
    } catch (e: any) { setLoadError(e.message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const update = (path: string, value: unknown) => {
    setForm((f) => (f ? setPath(f, path, value) : f));
    if (error?.field === path) setError(null);
  };

  const save = async () => {
    if (!form) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const res = await fetch('/api/host/profile/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError({ text: json.error || 'Nothing was saved. Please try again.', field: json.field }); return; }
      patchProfile({
        fullName: form.owner.fullName, displayName: form.owner.fullName, legalEntityName: form.venue.businessName,
        phone: form.owner.phone, email: form.owner.email, gender: form.owner.gender, dob: form.owner.dob,
        contact: { email: form.owner.email, phone: form.owner.phone || null },
        categories: json.venueTypes, categoriesHandled: json.venueTypes, offersAccommodation: json.offersAccommodation,
      });
      setSaved(form); setPreselectedStay(false);
      // The lock screen reads the section locks from the server.
      window.dispatchEvent(new Event('master_admin_refresh'));
      setNotice(json.needs_update
        ? 'Saved. Registration type, PAN, FSSAI, venue phone and stay times need database update 20261010000010 to be stored.'
        : 'Profile saved.');
    } catch {
      setError({ text: 'No connection. Nothing was saved.' });
    } finally {
      setSaving(false);
    }
  };

  return {
    form, pins, setPins, loadError, saving, error, notice, setNotice, preselectedStay,
    // A pre-selected stay type is a change the host has not saved yet.
    dirty: Boolean(form) && (preselectedStay || !sameForm(form, saved)), update, save, discard: () => { setForm(saved); setError(null); }, reload: load,
  };
}
