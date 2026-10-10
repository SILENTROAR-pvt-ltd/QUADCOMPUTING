'use client';

import { useState } from 'react';
import { useDrawer } from '@/lib/store/drawer.store';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { HostProfile } from '@/types/host';

const presets = ['/images/neuron-structure.jpg', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'];
const inputClass = 'w-full rounded-xl border border-white/20 bg-zinc-950 p-3 text-sm text-white placeholder:text-zinc-600 focus:border-white focus:outline-none focus:ring-1 focus:ring-white/30';

export default function EditProfileDrawer() {
  const close = useDrawer((state) => state.close);
  const profile = useHostWorkspace((state) => state.profile);
  const patchProfile = useHostWorkspace((state) => state.patchProfile);
  const [formData, setFormData] = useState<Partial<HostProfile>>({
    displayName: profile?.displayName || profile?.fullName || '',
    email: profile?.contact?.email || profile?.email || '',
    phone: profile?.contact?.phone || profile?.phone || '',
    bio: profile?.ecosystemStatement || profile?.bio || '',
    ecosystemStatement: profile?.ecosystemStatement || profile?.bio || '',
    bannerUrl: profile?.bannerUrl || '',
    avatarUrl: profile?.avatarUrl || null,
  });

  if (!profile) return null;
  const currentProfile = profile;
  const update = (patch: Partial<HostProfile>) => setFormData((current) => ({ ...current, ...patch }));
  function save() {
    patchProfile({
      ...formData,
      fullName: formData.displayName || currentProfile.fullName,
      email: formData.email || '',
      phone: formData.phone || '',
      bio: formData.ecosystemStatement || formData.bio || '',
      contact: { email: formData.email || '', phone: formData.phone || null },
    });
    close();
  }

  return <div className="fixed inset-0 z-50 flex justify-end bg-black/80" onClick={close}><aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-zinc-950 p-6 text-white shadow-2xl md:p-8" onClick={(event) => event.stopPropagation()}><div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4"><div><h2 className="font-serif text-2xl font-light">Edit Registered Profile Infrastructure</h2><p className="mt-1 font-mono text-xs text-zinc-500">Unique Owner Cafe ID: {profile.uniqueOwnerCafeId || profile.hostId || 'Pending assignment'}</p></div><button className="text-zinc-400 hover:text-white" onClick={close} type="button">Close</button></div><div className="space-y-5"><Field label="Header Banner Image URL"><input className={inputClass} type="url" value={formData.bannerUrl || ''} onChange={(event) => update({ bannerUrl: event.target.value })} /><div className="mt-3 grid grid-cols-3 gap-2">{presets.map((url) => <button aria-label="Select banner preset" className="h-14 rounded-lg border border-white/10 bg-cover bg-center hover:border-white" key={url} onClick={() => update({ bannerUrl: url })} style={{ backgroundImage: `url(${url})` }} type="button" />)}</div></Field><Field label="Profile Avatar Image URL"><input className={inputClass} type="url" value={formData.avatarUrl || ''} onChange={(event) => update({ avatarUrl: event.target.value })} /></Field><Field label="Display Name"><input className={inputClass} value={formData.displayName || ''} onChange={(event) => update({ displayName: event.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Email Address"><input className={inputClass} type="email" value={formData.email || ''} onChange={(event) => update({ email: event.target.value })} /></Field><Field label="Phone Number"><input className={inputClass} value={formData.phone || ''} onChange={(event) => update({ phone: event.target.value })} /></Field></div><Field label="Ecosystem Statement"><textarea className={`${inputClass} min-h-28`} value={formData.ecosystemStatement || ''} onChange={(event) => update({ ecosystemStatement: event.target.value, bio: event.target.value })} /></Field><button className="w-full rounded-xl bg-white py-3.5 text-xs uppercase tracking-widest text-black hover:bg-zinc-300" onClick={save} type="button">Commit Profile Changes</button></div></aside></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-[10px] uppercase tracking-widest text-zinc-500">{label}</span>{children}</label>; }
