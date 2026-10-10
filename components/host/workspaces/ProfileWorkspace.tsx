'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useProfile } from './profile/useProfile';
import { bindFields } from './profile/ProfileFields';
import { VenueTypeSection } from './profile/VenueTypeSection';
import { BusinessSection } from './profile/BusinessSection';
import { AddressSection, BankingSection, OwnerSection } from './profile/AddressOwnerBanking';
import { SecuritySection } from './profile/SecuritySection';

interface ProfileWorkspaceProps {
  onNavigate?: (tab: 'catalog' | 'inventory' | 'billing' | 'kitchen' | 'expenses') => void;
}

/** The venue's settings: what it is, its legal and tax details, address, owner, payments and security. */
export function ProfileWorkspace(_props: ProfileWorkspaceProps) {
  const p = useProfile();
  const f = bindFields(p.form, p.update, p.error);

  // Scroll the field the server rejected into view so the host sees why nothing saved.
  useEffect(() => {
    if (!p.error?.field) return;
    const group = p.error.field.split('.')[0];
    document.getElementById(group === 'venue' && p.error.field === 'venue.venueTypes' ? 'venue-type' : group === 'venue' ? 'business' : group === 'location' ? 'address' : group)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [p.error]);
  useEffect(() => { if (!p.notice) return; const t = setTimeout(() => p.setNotice(null), 6000); return () => clearTimeout(t); }, [p.notice]); // eslint-disable-line react-hooks/exhaustive-deps

  if (p.loadError) return <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{p.loadError} <button type="button" onClick={() => void p.reload()} className="ml-2 font-semibold underline cursor-pointer">Try again</button></p>;
  if (!p.form) return <div className="space-y-4" aria-busy="true">{[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-3xl border border-neutral-200 bg-neutral-100/70" />)}</div>;

  return (
    <div className="space-y-6 pb-32 text-neutral-900 animate-in fade-in duration-300">
      <header>
        <h1 className="font-serif text-3xl tracking-tight text-neutral-950">My profile</h1>
        <p className="mt-1 text-sm text-neutral-500">Your venue&apos;s details, how guests pay you, and who can open what.</p>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); void p.save(); }} className="space-y-6" noValidate>
        <VenueTypeSection types={p.form.venue.venueTypes} onChange={(t) => p.update('venue.venueTypes', t)}
          error={p.error?.field === 'venue.venueTypes' ? p.error.text : null} preselectedStay={p.preselectedStay} />
        <BusinessSection f={f} types={p.form.venue.venueTypes} />
        <AddressSection f={f} />
        <BankingSection f={f} />
        <OwnerSection f={f} />
        <SecuritySection pins={p.pins} setPins={p.setPins} locks={p.form.protectedModules}
          onLocksChange={(l) => p.update('protectedModules.__all', l)} onNotice={(m) => p.setNotice(m)} />

        {(p.dirty || p.error) && (
          <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className={`px-1 text-sm ${p.error ? 'text-rose-700' : 'text-neutral-700'}`} role={p.error ? 'alert' : undefined}>{p.error ? p.error.text : 'You have unsaved changes.'}</p>
            <div className="flex gap-2">
              <button type="button" onClick={p.discard} disabled={p.saving} className="h-10 rounded-xl px-4 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 cursor-pointer">Discard</button>
              <button type="submit" disabled={p.saving} className="h-10 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer">{p.saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        )}
      </form>

      {p.notice && (
        <div role="status" className="fixed bottom-6 right-6 z-[120] flex max-w-sm items-start gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{p.notice}</span>
          <button type="button" onClick={() => p.setNotice(null)} aria-label="Dismiss" className="text-neutral-400 hover:text-neutral-900 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
