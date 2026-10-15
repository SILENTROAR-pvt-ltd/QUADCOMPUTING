'use client';

import React from 'react';
import { Check, Loader2 } from 'lucide-react';

export interface PhotoCandidate {
  id: string;
  source: 'vault' | 'unsplash' | 'web';
  url: string;
  title: string;
  score: number;
  credit?: string;
  downloadLocation?: string;
  sourceUrl?: string;
}

const sourceLabel = (c: PhotoCandidate) => {
  if (c.source === 'vault') return 'Your vault';
  if (c.source === 'web') return `Web${c.credit ? ` · ${c.credit}` : ''}`;
  return `Stock${c.credit ? ` · ${c.credit}` : ''}`;
};

interface DishPhotoGridProps {
  candidates: PhotoCandidate[];
  dishName: string;
  busyId: string | null;
  onChoose: (c: PhotoCandidate) => void;
}

/** The photo choices for one dish. One tap sets that photo's address on the dish. Exact matches are marked. */
export function DishPhotoGrid({ candidates, dishName, busyId, onChoose }: DishPhotoGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {candidates.map((c) => {
        const exact = c.score >= 1;
        return (
          <li key={`${c.source}-${c.id}`}>
            <button type="button" onClick={() => onChoose(c)} disabled={busyId !== null}
              className={`group relative w-full overflow-hidden rounded-xl border text-left transition disabled:opacity-60 cursor-pointer ${exact ? 'border-neutral-900' : 'border-neutral-200 hover:border-neutral-400'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the venue-uploaded photo; images.unoptimized is set, so next/image would not resize it either */}
              <img src={c.url} alt={c.title || dishName} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <span className="block px-3 py-2">
                <span className="block truncate text-xs font-medium text-neutral-900">{c.title || 'Untitled photo'}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-neutral-500">
                  {sourceLabel(c)}
                  {exact && <span className="ml-auto flex items-center gap-0.5 font-semibold text-neutral-900"><Check className="h-3 w-3" /> Exact</span>}
                </span>
              </span>
              {busyId === c.id && <span className="absolute inset-0 grid place-items-center bg-white/70"><Loader2 className="h-5 w-5 animate-spin" /></span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
