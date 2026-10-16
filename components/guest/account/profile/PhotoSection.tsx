'use client';

import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { removeGuestPhoto, uploadGuestPhoto, type GuestAccountSummary } from '@/lib/guest/guest-account-client';
import { AVATAR_OPTIONS, type AvatarOption } from '@/lib/guest/avatar-options';
import { squarePhotoBlob } from '@/lib/guest/resize-avatar';

interface PhotoSectionProps {
  venueId: string;
  account: GuestAccountSummary;
  emoji: AvatarOption;
  emojiChosen: boolean;
  onEmoji: (e: AvatarOption) => void;
  onError: (message: string) => void;
}

/** The profile picture: a photo (cropped square and saved as soon as it is chosen), or one of the emoji avatars. */
export function PhotoSection({ venueId, account, emoji, emojiChosen, onEmoji, onError }: PhotoSectionProps) {
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    onError('');
    setBusy(true);
    try {
      const outcome = await uploadGuestPhoto(venueId, await squarePhotoBlob(f));
      if (!outcome.ok) onError(outcome.error);
    } catch (e: any) {
      onError(e?.message || 'The photo could not be saved.');
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  };

  const drop = async () => {
    onError('');
    setBusy(true);
    const outcome = await removeGuestPhoto(venueId);
    setBusy(false);
    if (!outcome.ok) onError(outcome.error);
  };

  return (
    <section aria-label="Profile picture" className="rounded-2xl border border-zinc-200 p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e8e2d5] bg-[#faf8f5] text-3xl">
          {account.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- the guest's own saved photo
            <img src={account.avatar_url} alt="Your photo" className="h-full w-full object-cover" />
          ) : <span aria-hidden="true">{emojiChosen ? emoji : account.avatar}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900">{account.avatar_url ? 'Your photo' : 'Emoji avatar'}</p>
          <p className="text-[11px] text-zinc-500">Photos are cropped to a square and saved as soon as you choose them.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => file.current?.click()} disabled={busy}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-zinc-950 px-3 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />} Upload photo
            </button>
            {account.avatar_url && (
              <button type="button" onClick={() => void drop()} disabled={busy} className="cursor-pointer rounded-xl border border-zinc-200 px-3 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50">Remove photo</button>
            )}
          </div>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose a photo" onChange={(e) => void pick(e.target.files?.[0])} />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-medium text-zinc-600">Or pick an emoji{account.avatar_url ? ' (replaces your photo when you save)' : ''}</p>
        <div role="radiogroup" aria-label="Emoji avatar" className="mt-1.5 grid grid-cols-8 gap-1.5">
          {AVATAR_OPTIONS.map((opt) => {
            const active = emojiChosen ? opt === emoji : !account.avatar_url && opt === account.avatar;
            return (
              <button key={opt} type="button" role="radio" aria-checked={active} aria-label={`Avatar ${opt}`} onClick={() => onEmoji(opt)}
                className={`flex h-10 cursor-pointer items-center justify-center rounded-xl border text-lg transition-colors ${active ? 'border-zinc-900 bg-zinc-950' : 'border-zinc-200 bg-white hover:border-zinc-400'}`}>
                <span aria-hidden="true">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
