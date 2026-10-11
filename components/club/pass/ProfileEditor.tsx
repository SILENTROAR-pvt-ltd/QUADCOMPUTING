'use client';

import React, { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { Button, Card, Label, Notice, field } from '../ui';
import { clubFetch, uploadMedia } from '../api';
import { useClub } from '../club-context';

/** Photo, club name (masked or not) and vibe line. The Viber ID and verified details stay as approved. */
export function ProfileEditor() {
  const { me, refresh } = useClub();
  const p = me.profile || {};
  const [alias, setAlias] = useState<string>(p.alias || '');
  const [masked, setMasked] = useState<boolean>(Boolean(p.alias_masked));
  const [vibe, setVibe] = useState<string>(p.vibe_line || '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const photo = async (f: File | undefined) => {
    if (!f) return;
    setBusy('photo');
    const res = await uploadMedia('avatars', f);
    setBusy('');
    setMsg(res.ok ? { ok: true, text: 'Photo updated.' } : { ok: false, text: res.error });
    if (res.ok) void refresh();
  };

  const save = async () => {
    setBusy('save');
    const res = await clubFetch('/me', { method: 'PATCH', body: { alias, alias_masked: masked, vibe_line: vibe } });
    setBusy('');
    setMsg(res.ok ? { ok: true, text: 'Profile saved.' } : { ok: false, text: res.error });
    if (res.ok) void refresh();
  };

  return (
    <Card className="space-y-4">
      <p className="font-semibold">Your club profile</p>
      <Button tone="quiet" busy={busy === 'photo'} onClick={() => file.current?.click()}><Camera className="h-4 w-4" /> Change photo</Button>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void photo(e.target.files?.[0]); e.target.value = ''; }} />
      <Label text="Club name" hint="optional"><input className={field} maxLength={30} value={alias} onChange={(e) => setAlias(e.target.value)} /></Label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#7c3aed]" checked={masked} onChange={(e) => setMasked(e.target.checked)} />
        <span>Mask my identity <span className="block text-xs text-[#2a1250]/55">Members see only your club name. Staff can always see who you are.</span></span>
      </label>
      <Label text="Vibe line"><input className={field} maxLength={120} value={vibe} onChange={(e) => setVibe(e.target.value)} /></Label>
      {msg && <Notice tone={msg.ok ? 'good' : 'bad'}>{msg.text}</Notice>}
      <Button busy={busy === 'save'} onClick={save}>Save profile</Button>
    </Card>
  );
}
