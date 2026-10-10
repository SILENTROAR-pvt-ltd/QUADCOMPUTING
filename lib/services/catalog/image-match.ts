// Matching a dish to a photo by its words. Pure, so the rules are tested directly.
// A photo is an EXACT match only when every word of the dish name appears in the photo's text
// (title, description, tags). Anything less is shown for a human to choose, never assigned.

const STOP = new Set([
  'the', 'and', 'with', 'of', 'a', 'an', 'in', 'on', 'for', 'pc', 'pcs', 'piece', 'pieces',
  'slice', 'slices', 'plain', 'spl', 'special', 'extra', 'mix', 'veg', 'seasonal',
]);

/** The meaningful words of a name: lower-cased, punctuation and bracketed notes removed, no stop words. */
export function nameTokens(text: string): string[] {
  const words = String(text || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
  return Array.from(new Set(words));
}

/** Share of the dish's words found in the candidate's text, from 0 to 1. */
export function matchScore(dishName: string, candidateText: string): number {
  const need = nameTokens(dishName);
  if (need.length === 0) return 0;
  const have = new Set(nameTokens(candidateText));
  const hits = need.filter((w) => have.has(w)).length;
  return hits / need.length;
}

export const EXACT = 1;

export interface PhotoCandidate {
  id: string;
  source: 'vault' | 'unsplash' | 'web';
  /** What the picker shows. */
  url: string;
  title: string;
  text: string;
  /** Web results only: the photo's own address, which is downloaded when the host picks it. */
  sourceUrl?: string;
}

export interface RankedPhoto extends PhotoCandidate {
  score: number;
}

/** Candidates that share at least one word with the dish, best first. Exact matches come first. */
export function rankPhotos(dishName: string, candidates: PhotoCandidate[]): RankedPhoto[] {
  return candidates
    .map((c) => ({ ...c, score: matchScore(dishName, `${c.title} ${c.text}`) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
