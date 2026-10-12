'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button, FOCUS, Label, Notice, field } from '../ui';
import { clubFetch } from '../api';
import { useClub } from '../club-context';
import { MAX_BIO, MAX_BIO_LINES, MAX_TRAVELER_KINDS, SOCIAL_NETWORKS, type TravelerKind } from '@/lib/club/identity/profile-details';
import { BrandMark } from '../profile/BrandMarks';
import { KIND_KEYS, KIND_META } from '../profile/traveler-kinds';

// The text shown before what the member types, so a handle reads as a handle.
const PREFIX: Record<string, string> = { linkedin: 'linkedin.com/in/', facebook: 'facebook.com/' };
const USERNAME_COOLDOWN_MS = 30 * 86_400_000;

/** Name, vibe line, the traveller types they choose (up to five), and the accounts to show as logos. */
export function ProfileEditor({ onSaved }: { onSaved?: () => void }) {
  const { me, refresh } = useClub();
  const p = me.profile || {};
  const [alias, setAlias] = useState<string>(p.alias || '');
  const [masked, setMasked] = useState<boolean>(Boolean(p.alias_masked));
  const [username, setUsername] = useState<string>(p.club_username || '');
  const [vibe, setVibe] = useState<string>(p.vibe_line || '');
  const [bio, setBio] = useState<string>(p.bio || '');
  const [kinds, setKinds] = useState<TravelerKind[]>((p.traveler_kinds as TravelerKind[]) || []);
  const [social, setSocial] = useState<Record<string, string>>((p.social_links as Record<string, string>) || {});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleKind = (k: TravelerKind) => {
    setKinds((list) => (list.includes(k) ? list.filter((x) => x !== k) : list.length < MAX_TRAVELER_KINDS ? [...list, k] : list));
  };
  const setNetwork = (key: string, value: string) => setSocial((s) => ({ ...s, [key]: value }));

  // The username can change once every 30 days; the server enforces it, and the form says when it opens.
  const changedAt = p.username_changed_at ? new Date(p.username_changed_at).getTime() : 0;
  const lockedUntil = changedAt && changedAt + USERNAME_COOLDOWN_MS > Date.now() ? new Date(changedAt + USERNAME_COOLDOWN_MS) : null;
  const lockedNote = lockedUntil
    ? `You changed it recently. You can change it again on ${lockedUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
    : `Shown under your name. Leave it empty to show your Viber ID${p.viber_id ? ` (${p.viber_id})` : ''}. Changeable once every 30 days.`;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await clubFetch('/me', { method: 'PATCH', body: { alias, alias_masked: masked, club_username: username, vibe_line: vibe, bio, traveler_kinds: kinds, social } });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: 'Profile saved.' } : { ok: false, text: res.error });
    if (res.ok) { await refresh(); onSaved?.(); }
  };

  return (
    <form onSubmit={save} className="space-y-7" noValidate>
      <section className="space-y-4">
        <Label text="Club name" hint="optional"><input data-autofocus className={field} maxLength={30} value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Night Owl" /></Label>
        <label className="flex items-start gap-3 rounded-2xl bg-[#f2f0e8] p-3.5 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#17301f]" checked={masked} onChange={(e) => setMasked(e.target.checked)} />
          <span>Mask my identity <span className="block text-xs text-[#14261b]/60">Members see only your club name, with no handle. Staff can always see who you are.</span></span>
        </label>
        <Label text="Username" hint={lockedUntil ? 'locked for now' : 'public handle'}>
          <div className="flex items-center rounded-2xl bg-white pl-3.5 ring-1 ring-[#14261b]/10 focus-within:ring-2 focus-within:ring-[#17301f]/30">
            <span aria-hidden="true" className="shrink-0 text-sm text-[#14261b]/45">@</span>
            <input className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-[#14261b] placeholder:text-[#14261b]/35 focus:outline-none disabled:opacity-60"
              maxLength={20} value={username} disabled={Boolean(lockedUntil)} placeholder="your_name" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              aria-describedby="username-note"
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))} />
          </div>
          <span id="username-note" className="mt-1.5 block text-xs text-[#14261b]/55">{lockedNote}</span>
        </Label>
        <Label text="Vibe line"><input className={field} maxLength={120} value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="Sunrise treks, late-night chai" /></Label>
        <Label text="About you" hint={`${bio.length} of ${MAX_BIO}`}>
          <textarea className={`${field} min-h-28 resize-none leading-relaxed`} rows={4} maxLength={MAX_BIO} value={bio} onChange={(e) => setBio(e.target.value)}
            placeholder="A few lines in your own words: where you have been, what you love, who you travel with." />
          <span className="mt-1.5 block text-xs text-[#14261b]/55">Up to {MAX_BIO_LINES} lines. Shown on your profile; leave it empty to hide the section from others.</span>
        </Label>
      </section>

      <section aria-labelledby="kinds-title" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h3 id="kinds-title" className="text-sm font-semibold">How do you travel?</h3>
          <span className="text-xs text-[#14261b]/55">{kinds.length} of {MAX_TRAVELER_KINDS} chosen</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {KIND_KEYS.map((k) => {
            const on = kinds.includes(k);
            const full = !on && kinds.length >= MAX_TRAVELER_KINDS;
            const Icon = KIND_META[k].icon;
            return (
              <button key={k} type="button" aria-pressed={on} disabled={full} onClick={() => toggleKind(k)}
                className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium transition disabled:opacity-40 ${on ? 'bg-[#17301f] text-[#f6f4ec] shadow-[0_10px_22px_-14px_rgba(23,48,31,0.9)]' : 'bg-white text-[#14261b]/80 ring-1 ring-[#14261b]/10 hover:text-[#14261b]'} ${FOCUS}`}>
                <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${on ? 'text-[#c8da4a]' : 'text-[#3c6b2b]'}`} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 leading-tight">{KIND_META[k].label}</span>
                {on && <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#c8da4a]" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="social-title" className="space-y-3">
        <div>
          <h3 id="social-title" className="text-sm font-semibold">Where can people find you?</h3>
          <p className="text-xs text-[#14261b]/55">Only the accounts you fill in appear on your profile, as logos.</p>
        </div>
        <div className="space-y-2.5">
          {SOCIAL_NETWORKS.map((n) => {
            const isUrl = n.kind === 'url';
            return (
              <div key={n.key} className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#14261b] ring-1 ring-[#14261b]/10"><BrandMark network={n.key} /></span>
                <div className="flex min-w-0 flex-1 items-center rounded-2xl bg-white pl-3 ring-1 ring-[#14261b]/10 focus-within:ring-2 focus-within:ring-[#17301f]/30">
                  {!isUrl && <span className="shrink-0 text-sm text-[#14261b]/45">{PREFIX[n.key] ?? '@'}</span>}
                  <input aria-label={`${n.label} ${isUrl ? 'link' : 'handle'}`} value={social[n.key] ?? ''} onChange={(e) => setNetwork(n.key, e.target.value)}
                    placeholder={isUrl ? 'https://your-site.com' : 'your-handle'} maxLength={isUrl ? 200 : 60}
                    className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-[#14261b] placeholder:text-[#14261b]/35 focus:outline-none" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {msg && <Notice tone={msg.ok ? 'good' : 'bad'}>{msg.text}</Notice>}
      <Button type="submit" busy={busy} className="w-full">Save profile</Button>
    </form>
  );
}
