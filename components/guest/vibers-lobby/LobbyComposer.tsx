'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { fitPhotoBlob } from '@/lib/guest/fit-photo';
import { LOBBY_CONTENT_MAX, LOBBY_KINDS, type LobbyKind } from '@/lib/guest/lobby-rules';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';
import { KIND_META } from './lobby-kind-meta';

type Outcome = { ok: true; value: LobbyPostView } | { ok: false; error: string };

interface LobbyComposerProps {
  table: string;
  canPost: boolean;
  onRequestJoin: () => void;
  onPost: (input: { kind: LobbyKind; content: string; table: string | null; photo?: Blob | null }) => Promise<Outcome>;
}

/** Share a message, a moment (a photo from the cafe), or a want. Posts are signed with the guest's account. */
export function LobbyComposer({ table, canPost, onRequestJoin, onPost }: LobbyComposerProps) {
  const [kind, setKind] = useState<LobbyKind>('message');
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  if (!canPost) {
    return (
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 text-center">
        <p className="font-serif text-lg text-neutral-950">Join the lobby</p>
        <p className="mt-1 text-xs text-neutral-500">Sign in to share moments and wants with the venue.</p>
        <button type="button" onClick={onRequestJoin} className="mt-3 rounded-2xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white cursor-pointer">Sign in to join</button>
      </div>
    );
  }

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setPhoto(await fitPhotoBlob(file));
    } catch (e: any) {
      setError(e?.message || 'That photo could not be added.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (kind === 'moment' && !photo) return setError('Add a photo for a moment.');
    if (kind === 'want' && !content) return setError('Say what you are looking for.');
    if (!content && !photo) return setError('Write something to share.');
    setBusy(true);
    setError(null);
    const out = await onPost({ kind, content, table: table || null, photo });
    setBusy(false);
    if (!out.ok) return setError(out.error);
    setText('');
    setPhoto(null);
  };

  return (
    <form onSubmit={submit} className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div role="radiogroup" aria-label="What are you sharing" className="flex gap-1.5">
        {LOBBY_KINDS.map((k) => {
          const meta = KIND_META[k];
          const active = kind === k;
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setKind(k)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                active ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <meta.Icon className="h-3.5 w-3.5" /> {meta.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">{KIND_META[kind].hint}</p>

      <textarea
        value={text}
        maxLength={LOBBY_CONTENT_MAX}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder={kind === 'want' ? 'e.g. a charger for my phone, please' : kind === 'moment' ? 'Add a caption (optional)' : 'Say something to the room'}
        className="mt-3 w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-none"
      />

      {preview && (
        <div className="relative mt-3 overflow-hidden rounded-2xl border border-neutral-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Photo to share" className="max-h-72 w-full object-cover" />
          <button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo" className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 cursor-pointer">
            <ImagePlus className="h-3.5 w-3.5" /> {photo ? 'Change photo' : 'Add photo'}
          </button>
          <span className="text-[11px] text-neutral-400">{text.length}/{LOBBY_CONTENT_MAX}</span>
        </div>
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-2xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Share
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose a photo" onChange={(e) => void pick(e.target.files?.[0])} />
      {error && <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
    </form>
  );
}

export default LobbyComposer;
