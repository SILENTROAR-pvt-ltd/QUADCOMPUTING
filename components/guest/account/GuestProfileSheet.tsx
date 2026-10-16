'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { updateGuestProfile, type GuestAccountSummary } from '@/lib/guest/guest-account-client';
import { isTravellerType, type TravellerTypeId } from '@/lib/guest/traveller-types';
import { isAvatarOption, type AvatarOption } from '@/lib/guest/avatar-options';
import { TravellerFields } from '@/components/guest/account/TravellerFields';
import { PhotoSection } from './profile/PhotoSection';
import { PinSection } from './profile/PinSection';

interface GuestProfileSheetProps {
  isOpen: boolean;
  venueId: string;
  account: GuestAccountSummary;
  onClose: () => void;
  onSaved: (account: GuestAccountSummary) => void;
}

const FIELD = 'mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[16px] text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none sm:text-sm';

/** Edit the signed-in guest's name, picture, traveller type and intro at this venue. */
export function GuestProfileSheet({ isOpen, venueId, account, onClose, onSaved }: GuestProfileSheetProps) {
  const [name, setName] = useState(account.display_name);
  const [travellerType, setTravellerType] = useState<TravellerTypeId | null>(isTravellerType(account.traveller_type) ? account.traveller_type : null);
  const [intro, setIntro] = useState(account.intro ?? '');
  const [emoji, setEmoji] = useState<AvatarOption>(isAvatarOption(account.avatar) ? account.avatar : '☕');
  const [emojiChosen, setEmojiChosen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Start from the saved values each time the sheet opens. Later account updates (for example a photo saved in this
  // sheet) must not wipe what the guest is typing.
  useEffect(() => {
    if (!isOpen) return;
    setName(account.display_name);
    setTravellerType(isTravellerType(account.traveller_type) ? account.traveller_type : null);
    setIntro(account.intro ?? '');
    setEmoji(isAvatarOption(account.avatar) ? account.avatar : '☕');
    setEmojiChosen(false);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter your name.');
    setBusy(true);
    // The emoji is only sent when the guest picked one, so saving a name never touches the photo.
    const outcome = await updateGuestProfile(venueId, { name: name.trim(), traveller_type: travellerType, intro, ...(emojiChosen ? { avatar: emoji } : {}) });
    setBusy(false);
    if (!outcome.ok) return setError(outcome.error);
    onSaved(outcome.account);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="guest-profile-title" className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <form onSubmit={save} noValidate className="max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto overscroll-contain rounded-t-[32px] border border-zinc-200/80 bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="guest-profile-title" className="font-serif text-xl text-zinc-950">Edit your profile</h2>
            <p className="mt-1 text-xs text-zinc-500">Your name, picture and intro show on your profile. Your handle stays the same, since your wallet uses it.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 grid h-10 w-10 cursor-pointer place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        <PhotoSection venueId={venueId} account={account} emoji={emoji} emojiChosen={emojiChosen} onEmoji={(o) => { setEmoji(o); setEmojiChosen(true); }} onError={setError} />

        <label className="block">
          <span className="text-[11px] font-medium text-zinc-600">Name</span>
          <input type="text" autoComplete="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={FIELD} />
        </label>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-600">
          Handle <span className="font-mono font-semibold text-zinc-900">{account.handle}</span> · can&apos;t be changed
        </div>

        <TravellerFields travellerType={travellerType} onTravellerType={setTravellerType} intro={intro} onIntro={setIntro} />

        {/* Only old @handle + PIN accounts have a PIN; a Vibers account signs in with its email and password. */}
        {account.has_pin && <PinSection venueId={venueId} />}

        {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 cursor-pointer rounded-2xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Cancel</button>
          <button type="submit" disabled={busy} className="flex-1 cursor-pointer rounded-2xl bg-zinc-950 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-50">
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default GuestProfileSheet;
