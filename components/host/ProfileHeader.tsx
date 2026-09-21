'use client';

import type { HostProfile } from '@/types/host';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';

interface ProfileHeaderProps {
  profile: HostProfile;
  completionScore: number;
  onOpenEditDrawer: () => void;
}

export default function ProfileHeader({ profile, completionScore, onOpenEditDrawer }: ProfileHeaderProps) {
  const router = useRouter();
  const clearWorkspace = useHostWorkspace((state) => state.clearWorkspace);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearWorkspace();
    router.push('/');
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
      <div className="relative h-48 border-b border-white/10 bg-zinc-900 bg-cover bg-center md:h-56" style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})` } : undefined}>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-black/40" />
        <div className="relative z-10 flex items-start justify-between gap-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="border border-white/20 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-300">Registered Profile Infrastructure</span>
            <span className="border border-white/30 bg-black/70 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-white">Unique Owner Cafe ID: {profile.uniqueOwnerCafeId}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button className="rounded-full border border-white/20 bg-black/80 px-4 py-2 text-xs font-medium uppercase tracking-widest text-zinc-300 transition hover:bg-black hover:text-white" onClick={handleSignOut} type="button">Sign Out</button>
            <button className="rounded-full bg-white px-4 py-2 text-xs font-medium uppercase tracking-widest text-black transition hover:bg-zinc-300" onClick={onOpenEditDrawer} type="button">Edit Profile &amp; Banner</button>
          </div>
        </div>
      </div>
      <div className="relative z-10 px-6 pb-6">
        <div className="-mt-14 mb-4 flex items-end justify-between">
          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/20 bg-black font-serif text-4xl text-white shadow-2xl">
            {profile.avatarUrl ? <Image src={profile.avatarUrl} alt={profile.displayName} fill sizes="112px" className="object-cover" /> : <span>{profile.displayName.charAt(0)}</span>}
          </div>
          <div className="text-right"><span className="block text-[10px] uppercase tracking-widest text-zinc-400">Completion Status</span><span className="font-serif text-2xl text-white">{completionScore}% Complete</span></div>
        </div>
        <div className="mb-6 h-2 overflow-hidden rounded-full border border-white/10 bg-zinc-900"><div className="h-full bg-white transition-all duration-700" style={{ width: `${completionScore}%` }} /></div>
        <div className="grid gap-6 border-t border-white/10 pt-5 md:grid-cols-3">
          <div><h2 className="font-serif text-2xl text-white">{profile.displayName}</h2><p className="pt-1 text-xs text-zinc-500">{profile.contact.email || 'No email set'} / {profile.contact.phone || 'No phone set'}</p></div>
          <div><span className="mb-2 block text-[10px] uppercase tracking-widest text-zinc-500">Categories Handled</span><div className="flex flex-wrap gap-2">{profile.categoriesHandled.map((category) => <span className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-300" key={category}>{category}</span>)}</div></div>
          <div><span className="block text-[10px] uppercase tracking-widest text-zinc-500">Ecosystem Statement</span><p className="text-xs leading-relaxed text-zinc-300">{profile.ecosystemStatement || 'Add a brief ecosystem statement to introduce your establishment.'}</p></div>
        </div>
      </div>
    </section>
  );
}
