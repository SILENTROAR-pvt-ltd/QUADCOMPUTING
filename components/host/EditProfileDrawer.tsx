'use client';

import { useState } from 'react';
import { useDrawer } from '@/lib/store/drawer.store';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { createClient } from '@/lib/supabase/client';

const presets = ['/images/neuron-structure.jpg', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'];
const inputClass = 'w-full rounded-xl border border-white/20 bg-zinc-950 p-3 text-sm text-white placeholder:text-zinc-600 focus:border-white focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50';

export default function EditProfileDrawer() {
  const close = useDrawer((state) => state.close);
  const profile = useHostWorkspace((state) => state.profile);
  const patchProfile = useHostWorkspace((state) => state.patchProfile);
  
  const [bannerUrl, setBannerUrl] = useState(profile?.bannerUrl || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [email, setEmail] = useState(profile?.contact.email || '');
  const [phone, setPhone] = useState(profile?.contact.phone || '');
  const [ecosystemStatement, setEcosystemStatement] = useState(profile?.ecosystemStatement || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!profile) return null;

  async function save() {
    setIsSaving(true);
    setError('');

    try {
      const supabase = createClient();

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("You must be logged in to update your profile.");
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: displayName,
          ecosystem_statement: ecosystemStatement,
        })
        .eq('id', session.user.id);

      if (updateError) {
        throw updateError;
      }

      patchProfile({ 
        displayName, 
        bannerUrl: bannerUrl || null, 
        avatarUrl: avatarUrl || null, 
        ecosystemStatement, 
        contact: { email, phone: phone || null } 
      });
      close();
    } catch (err) {
      console.error('[EditProfileDrawer] DB Sync Error:', err);
      setError(err instanceof Error ? err.message : 'Database synchronization failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80" onClick={close}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-zinc-950 p-6 text-white shadow-2xl md:p-8" onClick={(event) => event.stopPropagation()}>
        <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="font-serif text-2xl font-light">Edit Registered Profile Infrastructure</h2>
            <p className="mt-1 font-mono text-xs text-zinc-500">Unique Owner Cafe ID: {profile.uniqueOwnerCafeId}</p>
          </div>
          <button className="text-zinc-400 transition hover:text-white" onClick={close} type="button">Close</button>
        </div>
        
        <div className="space-y-5">
          <Field label="Header Banner Image URL">
            <input className={inputClass} type="url" disabled={isSaving} value={bannerUrl} onChange={(event) => setBannerUrl(event.target.value)} />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {presets.map((url) => (
                <button aria-label="Select banner preset" className="h-14 rounded-lg border border-white/10 bg-cover bg-center transition hover:border-white disabled:opacity-50" disabled={isSaving} key={url} onClick={() => setBannerUrl(url)} style={{ backgroundImage: `url(${url})` }} type="button" />
              ))}
            </div>
          </Field>
          
          <Field label="Profile Avatar Image URL">
            <input className={inputClass} type="url" disabled={isSaving} value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />
          </Field>
          
          <Field label="Display Name">
            <input className={inputClass} disabled={isSaving} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </Field>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email Address">
              <input className={inputClass} type="email" disabled={isSaving} value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field label="Phone Number">
              <input className={inputClass} disabled={isSaving} value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Field>
          </div>
          
          <Field label="Ecosystem Statement">
            <textarea className={`${inputClass} min-h-28`} disabled={isSaving} value={ecosystemStatement} onChange={(event) => setEcosystemStatement(event.target.value)} />
          </Field>
          
          {error && <p className="text-[11px] text-red-400">{error}</p>}

          <button className="w-full rounded-xl bg-white py-3.5 text-xs uppercase tracking-widest text-black transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-600" disabled={isSaving} onClick={save} type="button">
            {isSaving ? 'Synchronizing with Database...' : 'Commit Profile Changes'}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { 
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] uppercase tracking-widest text-zinc-500">{label}</span>
      {children}
    </label>
  ); 
}
