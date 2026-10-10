'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { changeGuestPin, removeGuestPhoto, updateGuestProfile, uploadGuestPhoto, type GuestAccountSummary } from '@/lib/guest/guest-account-client';
import { isTravellerType, type TravellerTypeId } from '@/lib/guest/traveller-types';
import { AVATAR_OPTIONS, isAvatarOption, type AvatarOption } from '@/lib/guest/avatar-options';
import { squarePhotoBlob } from '@/lib/guest/resize-avatar';
import { TravellerFields } from '@/components/guest/account/TravellerFields';

interface GuestProfileSheetProps {
  isOpen: boolean;
  venueId: string;
  account: GuestAccountSummary;
  onClose: () => void;
  onSaved: (account: GuestAccountSummary) => void;
}

const field =
  'w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white transition-all';

function PinField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-zinc-600">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        autoComplete={autoComplete}
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="6 digits"
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm tracking-[0.4em] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none transition-all"
      />
    </label>
  );
}

/** Edit the signed-in guest's name, picture, traveller type and intro at this venue. */
export function GuestProfileSheet({ isOpen, venueId, account, onClose, onSaved }: GuestProfileSheetProps) {
  const [name, setName] = useState(account.display_name);
  const [travellerType, setTravellerType] = useState<TravellerTypeId | null>(isTravellerType(account.traveller_type) ? account.traveller_type : null);
  const [intro, setIntro] = useState(account.intro ?? '');
  const [emoji, setEmoji] = useState<AvatarOption>(isAvatarOption(account.avatar) ? account.avatar : '☕');
  const [emojiChosen, setEmojiChosen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pictureBusy, setPictureBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const savePin = async () => {
    setPinMsg(null);
    if (newPin !== confirmPin) return setPinMsg({ ok: false, text: 'The two new PINs do not match.' });
    setPinBusy(true);
    const outcome = await changeGuestPin(venueId, currentPin, newPin);
    setPinBusy(false);
    if (!outcome.ok) return setPinMsg({ ok: false, text: outcome.error });
    setPinOpen(false);
    setCurrentPin(''); setNewPin(''); setConfirmPin('');
    setPinMsg({ ok: true, text: 'PIN changed. Your other devices are signed out.' });
  };

  // Start from the saved values each time the sheet opens. Later account updates (for example a
  // photo saved in this sheet) must not wipe what the guest is typing.
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

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setPictureBusy(true);
    try {
      const blob = await squarePhotoBlob(file);
      const outcome = await uploadGuestPhoto(venueId, blob);
      if (!outcome.ok) setError(outcome.error);
    } catch (e: any) {
      setError(e?.message || 'The photo could not be saved.');
    } finally {
      setPictureBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const dropPhoto = async () => {
    setError('');
    setPictureBusy(true);
    const outcome = await removeGuestPhoto(venueId);
    setPictureBusy(false);
    if (!outcome.ok) setError(outcome.error);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter your name.');
    setBusy(true);
    const outcome = await updateGuestProfile(venueId, {
      name: name.trim(),
      traveller_type: travellerType,
      intro,
      // Only sent when the guest picked an emoji, so saving a name never touches the photo.
      ...(emojiChosen ? { avatar: emoji } : {}),
    });
    setBusy(false);
    if (!outcome.ok) return setError(outcome.error);
    onSaved(outcome.account);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="guest-profile-title" className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <form onSubmit={save} noValidate className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl border border-zinc-200/80 p-6 shadow-2xl space-y-4" style={{ maxHeight: '92dvh', overflowY: 'auto' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="guest-profile-title" className="font-serif text-xl text-zinc-950">Edit your profile</h2>
            <p className="mt-1 text-xs text-zinc-500">Your name, picture and intro show on your profile. Your handle stays the same, since your wallet uses it.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 -mr-1 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-black cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Picture: a photo, or an emoji avatar */}
        <section aria-label="Profile picture" className="rounded-2xl border border-zinc-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e8e2d5] bg-[#faf8f5] text-3xl">
              {account.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.avatar_url} alt="Your photo" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden="true">{emojiChosen ? emoji : account.avatar}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-900">{account.avatar_url ? 'Your photo' : 'Emoji avatar'}</p>
              <p className="text-[11px] text-zinc-500">Photos are cropped to a square and saved as soon as you choose them.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={pictureBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                >
                  {pictureBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />} Upload photo
                </button>
                {account.avatar_url && (
                  <button type="button" onClick={dropPhoto} disabled={pictureBusy} className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer">
                    Remove photo
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-label="Choose a photo"
                onChange={(e) => void pickPhoto(e.target.files?.[0])}
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-medium text-zinc-600">Or pick an emoji{account.avatar_url ? ' (replaces your photo when you save)' : ''}</p>
            <div role="radiogroup" aria-label="Emoji avatar" className="mt-1.5 grid grid-cols-8 gap-1.5">
              {AVATAR_OPTIONS.map((opt) => {
                const active = emojiChosen ? opt === emoji : !account.avatar_url && opt === account.avatar;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`Avatar ${opt}`}
                    onClick={() => { setEmoji(opt); setEmojiChosen(true); }}
                    className={`flex h-9 items-center justify-center rounded-xl border text-lg transition-colors cursor-pointer ${active ? 'border-zinc-900 bg-zinc-950' : 'border-zinc-200 bg-white hover:border-zinc-400'}`}
                  >
                    <span aria-hidden="true">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <label className="block">
          <span className="text-[11px] font-medium text-zinc-600">Name</span>
          <input type="text" autoComplete="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={`mt-1 ${field}`} />
        </label>

        <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3.5 py-2.5 text-xs text-zinc-600">
          Handle <span className="font-mono font-semibold text-zinc-900">{account.handle}</span> · can&apos;t be changed
        </div>

        <TravellerFields
          travellerType={travellerType}
          onTravellerType={setTravellerType}
          intro={intro}
          onIntro={setIntro}
        />

        {/* Security: change PIN. Its own action, so it never saves the profile fields. */}
        <section aria-label="Security" className="rounded-2xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">Security</p>
              <p className="text-[11px] text-zinc-500">Changing your PIN signs you out on your other devices.</p>
            </div>
            {!pinOpen && (
              <button type="button" onClick={() => { setPinOpen(true); setPinMsg(null); }} className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 cursor-pointer">
                Change PIN
              </button>
            )}
          </div>
          {pinOpen && (
            <div className="mt-3 space-y-2.5">
              <PinField label="Current PIN" value={currentPin} onChange={setCurrentPin} autoComplete="current-password" />
              <PinField label="New PIN" value={newPin} onChange={setNewPin} autoComplete="new-password" />
              <PinField label="Confirm new PIN" value={confirmPin} onChange={setConfirmPin} autoComplete="new-password" />
              {pinMsg && <p role="alert" className={`text-xs font-medium ${pinMsg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{pinMsg.text}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setPinOpen(false); setCurrentPin(''); setNewPin(''); setConfirmPin(''); setPinMsg(null); }} className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer">Cancel</button>
                <button type="button" disabled={pinBusy} onClick={savePin} className="flex-1 rounded-xl bg-zinc-950 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 cursor-pointer">
                  {pinBusy ? 'Saving…' : 'Save new PIN'}
                </button>
              </div>
            </div>
          )}
          {pinMsg && !pinOpen && (
            <p role="status" className={`mt-3 text-xs font-medium ${pinMsg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{pinMsg.text}</p>
          )}
        </section>

        {error && <p role="alert" className="text-xs text-rose-600 font-medium">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-zinc-200 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer">Cancel</button>
          <button type="submit" disabled={busy} className="flex-1 py-3 rounded-2xl bg-zinc-950 text-white text-sm font-semibold hover:bg-zinc-800 cursor-pointer disabled:opacity-50 disabled:cursor-wait">
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default GuestProfileSheet;
