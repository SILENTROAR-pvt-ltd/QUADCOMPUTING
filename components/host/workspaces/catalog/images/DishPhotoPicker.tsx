'use client';

import React, { useEffect, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import type { CatalogItem } from '@/types';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { DishPhotoGrid, type PhotoCandidate } from './DishPhotoGrid';
import { DishPhotoLinkForm } from './DishPhotoLinkForm';
import { setDishPhotoFromUrl } from './dish-photo-requests';

/** How many photos are offered at once: the closest matches only. */
const MAX_SHOWN = 5;

interface DishPhotoPickerProps {
  item: CatalogItem;
  onClose: () => void;
  onPicked: () => void;
}

/** Pick the photo for one dish. The dish name is searched as soon as this opens; type other words to search again. */
export function DishPhotoPicker({ item, onClose, onPicked }: DishPhotoPickerProps) {
  const [query, setQuery] = useState(item.name);
  const [candidates, setCandidates] = useState<PhotoCandidate[]>([]);
  const [stockOn, setStockOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async (q: string) => {
    setLoading(true);
    setError(null);
    const res = await apiRequest<any>(`/api/host/catalog/images/search?item_id=${encodeURIComponent(String(item.id))}&q=${encodeURIComponent(q)}`, { cache: 'no-store' });
    setLoading(false);
    if (!res.ok) return setError(res.error || 'Photo search failed. Please try again.');
    setCandidates(res.data?.candidates ?? []);
    setStockOn(Boolean(res.data?.stock_search));
  };

  useEffect(() => { void search(item.name); }, [item.id, item.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Only photos that share a word with the search, best first, so every choice is relevant.
  const shown = candidates
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SHOWN);

  const choose = async (c: PhotoCandidate) => {
    setBusyId(c.id);
    setError(null);
    const body = c.source === 'vault'
      ? { item_id: String(item.id), source: 'vault', vault_id: c.id }
      : { item_id: String(item.id), source: 'unsplash', url: c.url, download_location: c.downloadLocation };
    const res = c.source === 'web'
      ? await setDishPhotoFromUrl(String(item.id), c.sourceUrl ?? '')
      : await apiRequest('/api/host/catalog/images/assign', jsonRequest('POST', body));
    setBusyId(null);
    if (!res.ok) return setError(res.error || 'Could not set that photo.');
    onPicked();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Photo for ${item.name}`} className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/40 p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Choose a photo</p>
            <h2 className="font-serif text-xl text-neutral-950">{item.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void search(query.trim() || item.name); }} className="flex gap-2 border-b border-neutral-100 px-6 py-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by words, e.g. misal pav"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
          </div>
          <button type="submit" className="h-10 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white cursor-pointer">Search</button>
        </form>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</p>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-14 text-center text-sm text-neutral-600">
              No close matches for &ldquo;{query}&rdquo;. Try other words, upload a photo to your Photo Vault
              {stockOn ? '' : ', or ask your admin to enable stock photo search'}.
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-neutral-500">The closest {shown.length} {shown.length === 1 ? 'match' : 'matches'}. Pick one to use it for this dish.</p>
              <DishPhotoGrid candidates={shown} dishName={item.name} busyId={busyId} onChoose={(c) => void choose(c)} />
            </>
          )}
          <DishPhotoLinkForm itemId={String(item.id)} onPicked={onPicked} />
          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default DishPhotoPicker;
