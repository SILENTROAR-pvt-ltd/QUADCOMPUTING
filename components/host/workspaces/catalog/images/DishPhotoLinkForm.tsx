'use client';

import React, { useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { setDishPhotoFromUrl } from './dish-photo-requests';

interface DishPhotoLinkFormProps {
  itemId: string;
  onPicked: () => void;
}

/** Paste a photo's web address (JPG, PNG or WebP). The server downloads it and keeps its own copy. */
export function DishPhotoLinkForm({ itemId, onPicked }: DishPhotoLinkFormProps) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await setDishPhotoFromUrl(itemId, url.trim());
    setBusy(false);
    if (!res.ok) return setError(res.error || 'Could not use that link.');
    onPicked();
  };

  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-neutral-200 p-4">
      <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        <Link2 className="h-3.5 w-3.5" /> Or paste a photo link
      </label>
      <div className="mt-2 flex gap-2">
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (.jpg, .png or .webp)"
          className="h-10 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
        <button type="submit" disabled={busy || !url.trim()} className="h-10 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Use photo'}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
    </form>
  );
}
